const https = require('https');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Setting = require('../models/Setting');

// Mô hình chuẩn theo Gemini Interactions API mới nhất
const MODEL_CHAT_AND_ANALYZE = 'gemini-4-hydrogen';
const MODEL_FAST_TASK = 'gemini-3.5-flash-lite';

// Lấy Gemini API Key từ biến môi trường hoặc cấu hình hệ thống trong DB
const getGeminiApiKey = async () => {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
    return process.env.GEMINI_API_KEY.trim();
  }
  try {
    const setting = await Setting.findOne();
    if (setting?.gemini_api_key && setting.gemini_api_key.trim() !== '') {
      return setting.gemini_api_key.trim();
    }
  } catch {}
  return '';
};

// Hàm gọi Gemini Interactions API (Ưu tiên SDK @google/genai nếu đã cài, hoặc gọi HTTPS trực tiếp tới v1beta/interactions)
const callGeminiInteraction = async ({
  model = MODEL_CHAT_AND_ANALYZE,
  systemInstruction = '',
  input = '',
  responseSchema = null,
}) => {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    return null;
  }

  // 1. Thử dùng SDK @google/genai chính thức nếu có trong node_modules
  try {
    const { GoogleGenAI } = require('@google/genai');
    const client = new GoogleGenAI({ apiKey });
    const reqParams = {
      model,
      input,
    };
    if (systemInstruction) {
      reqParams.system_instruction = systemInstruction;
    }
    if (responseSchema) {
      reqParams.response_format = {
        type: 'text',
        mime_type: 'application/json',
        schema: responseSchema,
      };
    }
    const interaction = await client.interactions.create(reqParams);
    if (interaction?.output_text) {
      return interaction.output_text;
    }
  } catch (sdkErr) {
    // Nếu chưa cài package @google/genai thì chuyển sang gọi REST v1beta/interactions bên dưới
  }

  // 2. Gọi trực tiếp REST Interactions API (/v1beta/interactions) bằng module https chuẩn của Node.js
  return new Promise((resolve) => {
    const payload = {
      model,
      input,
    };
    if (systemInstruction) {
      payload.system_instruction = systemInstruction;
    }
    if (responseSchema) {
      payload.response_format = {
        type: 'text',
        mime_type: 'application/json',
        schema: responseSchema,
      };
    }

    const bodyStr = JSON.stringify(payload);
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: '/v1beta/interactions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
        'Api-Revision': '2026-05-20',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
      timeout: 12000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.output_text) {
            return resolve(parsed.output_text);
          }
          // Trích xuất text từ mảng steps của Interactions API
          if (Array.isArray(parsed.steps)) {
            const textParts = [];
            for (const step of parsed.steps) {
              if (step.type === 'model_output' && Array.isArray(step.content)) {
                for (const part of step.content) {
                  if (part.type === 'text' && part.text) {
                    textParts.push(part.text);
                  }
                }
              }
            }
            if (textParts.length > 0) {
              return resolve(textParts.join('\n'));
            }
          }
          resolve(null);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.write(bodyStr);
    req.end();
  });
};

// Xác định khung giờ ẩm thực trong ngày
const getTimeSlotContext = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) {
    return {
      slot: 'Bữa sáng năng lượng',
      icon: '🌅',
      keywords: ['phở', 'cà phê', 'bún'],
      greeting: 'Chào buổi sáng! Khởi đầu ngày mới thật tỉnh táo và ấm bụng nhé.',
    };
  }
  if (hour >= 10 && hour < 14) {
    return {
      slot: 'Bữa trưa đậm đà',
      icon: '☀️',
      keywords: ['cơm', 'bún đậu', 'combo', 'trà'],
      greeting: 'Đến giờ ăn trưa rồi! Nạp ngay năng lượng với các món chính chắc bụng và combo tiết kiệm.',
    };
  }
  if (hour >= 14 && hour < 18) {
    return {
      slot: 'Bữa xế chiều & Giải nhiệt',
      icon: '🌤️',
      keywords: ['bánh xèo', 'trà đào', 'cà phê', 'thức uống'],
      greeting: 'Buổi chiều thư giãn! Thưởng thức món ăn vặt giòn rụm kèm ly nước mát lạnh thì còn gì bằng.',
    };
  }
  return {
    slot: 'Bữa tối sum vầy',
    icon: '🌙',
    keywords: ['bún đậu', 'bánh xèo', 'phở', 'combo'],
    greeting: 'Chào buổi tối! Cùng thưởng thức bữa tối nóng hổi, trọn vị sau một ngày làm việc nhé.',
  };
};

// ================= 1. AI CHATBOT TƯ VẤN ẨM THỰC & GỢI Ý COMBO =================
const chatWithAI = async (req, res) => {
  try {
    const { message = '', userName = 'bạn' } = req.body;
    const products = await Product.find({ is_available: { $ne: false } }).sort({
      best_seller: -1,
      createdAt: -1,
    });

    if (products.length === 0) {
      return res.json({
        reply: 'Hiện tại thực đơn của quán đang được cập nhật, bạn vui lòng quay lại sau ít phút nhé!',
        suggestedProducts: [],
        mode: 'local',
      });
    }

    const menuSummary = products
      .map(
        (p) =>
          `- ID: "${p._id}" | Tên: "${p.product_name}" | Danh mục: "${p.category}" | Giá: ${p.base_price}đ | BestSeller: ${
            p.best_seller ? 'Có' : 'Không'
          } | Mô tả: ${p.description || ''}`
      )
      .join('\n');

    const systemInstruction = `Bạn là "Trợ lý Ẩm thực AI RETASTE" — một chuyên gia tư vấn món ăn thân thiện, nhiệt tình, sành ăn tại nhà hàng RETASTE.
Dưới đây là danh sách thực đơn thực tế hiện có trong CSDL của quán:
${menuSummary}

Quy tắc trả lời:
1. Trả lời bằng tiếng Việt tự nhiên, ngắn gọn, ấm áp, xưng "mình" hoặc "RETASTE AI" và gọi khách là "${userName}".
2. Chỉ gợi ý các món CÓ TRONG THỰC ĐƠN ở trên. Nếu khách đưa ra ngân sách (VD: 70k, 100k, 150k), hãy tính toán tổng tiền sao cho phù hợp ngân sách đó.
3. Trả về đúng định dạng JSON gồm 2 trường:
   - "reply": Câu trả lời tư vấn chi tiết, có nêu tên món và giá tiền.
   - "recommended_ids": Mảng chứa tối đa 3 chuỗi ID của các món ăn phù hợp nhất từ thực đơn.`;

    const responseSchema = {
      type: 'object',
      properties: {
        reply: { type: 'string' },
        recommended_ids: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['reply', 'recommended_ids'],
    };

    const aiRaw = await callGeminiInteraction({
      model: MODEL_CHAT_AND_ANALYZE,
      systemInstruction,
      input: `Khách hàng hỏi: "${message}"`,
      responseSchema,
    });

    if (aiRaw) {
      try {
        const cleaned = aiRaw.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        const suggestedProducts = products.filter((p) =>
          (parsed.recommended_ids || []).includes(String(p._id))
        );
        return res.json({
          reply: parsed.reply,
          suggestedProducts:
            suggestedProducts.length > 0 ? suggestedProducts : products.slice(0, 2),
          mode: 'gemini-4-hydrogen',
        });
      } catch {}
    }

    // ---- CHẾ ĐỘ XỬ LÝ NGÔN NGỮ TỰ NHIÊN NỘI BỘ (FALLBACK THÔNG MINH KHI CHƯA CÓ API KEY) ----
    const q = message.toLowerCase();

    // Phát hiện ngân sách trong câu hỏi (VD: "70k", "100 nghìn", "120000")
    let budget = null;
    const kMatch = q.match(/(\d+)\s*(k|nghìn|ngàn)/i);
    const fullMatch = q.match(/(\d{5,7})/);
    if (kMatch) {
      budget = Number(kMatch[1]) * 1000;
    } else if (fullMatch) {
      budget = Number(fullMatch[1]);
    }

    // Chấm điểm mức độ khớp của từng món ăn với câu hỏi của khách
    const scored = products.map((p) => {
      let score = p.best_seller ? 2 : 0;
      const name = (p.product_name || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();

      if (q.includes(name)) score += 10;
      name.split(/\s+/).forEach((word) => {
        if (word.length > 2 && q.includes(word)) score += 3;
      });

      if (
        (q.includes('uống') || q.includes('nước') || q.includes('khát') || q.includes('mát') || q.includes('trà') || q.includes('cà phê')) &&
        cat.includes('thức uống')
      ) {
        score += 6;
      }
      if (
        (q.includes('no') || q.includes('trưa') || q.includes('tối') || q.includes('đói') || q.includes('ăn')) &&
        cat.includes('đồ ăn')
      ) {
        score += 4;
      }
      if (
        (q.includes('2 người') || q.includes('hai người') || q.includes('nhóm') || q.includes('tiết kiệm') || q.includes('combo')) &&
        cat.includes('combo')
      ) {
        score += 7;
      }
      if ((q.includes('nóng') || q.includes('mưa') || q.includes('lạnh') || q.includes('sáng')) && (name.includes('phở') || desc.includes('nóng'))) {
        score += 6;
      }
      if ((q.includes('giòn') || q.includes('vặt')) && (name.includes('bánh xèo') || name.includes('bún đậu') || desc.includes('giòn'))) {
        score += 6;
      }
      return { product: p, score };
    });

    scored.sort((a, b) => b.score - a.score);

    let chosen = [];
    if (budget) {
      let runningTotal = 0;
      for (const item of scored) {
        if (runningTotal + item.product.base_price <= budget && chosen.length < 3) {
          chosen.push(item.product);
          runningTotal += item.product.base_price;
        }
      }
      if (chosen.length === 0) {
        const cheapest = [...products].sort((a, b) => a.base_price - b.base_price)[0];
        if (cheapest) chosen = [cheapest];
      }
    } else {
      chosen = scored.slice(0, 3).map((s) => s.product);
    }

    const totalSuggested = chosen.reduce((s, p) => s + (p.base_price || 0), 0);
    const namesList = chosen
      .map((p) => `**${p.product_name}** (${Number(p.base_price).toLocaleString('vi-VN')}đ)`)
      .join(', ');

    let replyText = '';
    if (budget) {
      replyText = `Chào ${userName}! Với ngân sách khoảng **${budget.toLocaleString(
        'vi-VN'
      )}đ**, RETASTE AI gợi ý cho bạn thực đơn cực hợp lý gồm: ${namesList}. Tổng cộng chỉ **${totalSuggested.toLocaleString(
        'vi-VN'
      )}đ** mà đảm bảo ngon miệng, chuẩn vị! Bạn có thể bấm nút bên dưới để thêm ngay vào giỏ hàng nhé.`;
    } else {
      replyText = `Chào ${userName}! Dựa trên nhu cầu của bạn, mình xin gợi ý các món đang được yêu thích nhất tại RETASTE: ${namesList}. Món nào cũng được chế biến nóng hổi và tươi mới trong ngày, bạn chọn thử ngay nhé!`;
    }

    return res.json({
      reply: replyText,
      suggestedProducts: chosen,
      mode: 'smart-hybrid',
    });
  } catch (error) {
    console.error('Lỗi AI Chat:', error);
    res.status(500).json({ message: 'Lỗi xử lý AI Chat', error: error.message });
  }
};

// ================= 2. AI GỢI Ý CÁ NHÂN HÓA THEO KHUNG GIỜ & LỊCH SỬ =================
const getSmartTimeRecommend = async (req, res) => {
  try {
    const { userId } = req.query;
    const timeCtx = getTimeSlotContext();
    const products = await Product.find({ is_available: { $ne: false } }).sort({
      best_seller: -1,
      createdAt: -1,
    });

    let favoriteCategory = '';
    let orderCount = 0;

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const userOrders = await Order.find({ user_id: userId });
      orderCount = userOrders.length;
      const catCounter = {};
      const prodIds = [];
      userOrders.forEach((o) => {
        (o.items || []).forEach((it) => {
          if (it.product_id && mongoose.Types.ObjectId.isValid(it.product_id)) {
            prodIds.push(it.product_id);
          }
        });
      });
      if (prodIds.length > 0) {
        const bought = await Product.find({ _id: { $in: prodIds } });
        bought.forEach((p) => {
          const c = p.category || 'Đồ ăn';
          catCounter[c] = (catCounter[c] || 0) + 1;
        });
        let max = 0;
        for (const c in catCounter) {
          if (catCounter[c] > max) {
            max = catCounter[c];
            favoriteCategory = c;
          }
        }
      }
    }

    const insightText = favoriteCategory
      ? `${timeCtx.icon} ${timeCtx.slot}: Dựa trên ${orderCount} đơn hàng trước đây, AI nhận thấy bạn đặc biệt yêu thích nhóm "${favoriteCategory}" nên đã ưu tiên chọn lọc các món chuẩn gu nhất cho bạn!`
      : `${timeCtx.icon} ${timeCtx.slot}: ${timeCtx.greeting}`;

    res.json({
      timeSlot: timeCtx.slot,
      icon: timeCtx.icon,
      favoriteCategory,
      insight: insightText,
      totalProducts: products.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi gợi ý theo khung giờ', error: error.message });
  }
};

// ================= 3. AI TỰ ĐỘNG VIẾT MÔ TẢ MÓN ĂN CHO ADMIN =================
const generateDishDescription = async (req, res) => {
  try {
    const { product_name = '', category = 'Đồ ăn', base_price = '' } = req.body;
    if (!product_name.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập tên món ăn trước khi tạo mô tả!' });
    }

    const prompt = `Hãy viết đúng 1 câu mô tả ẩm thực ngắn gọn (khoảng 20-32 từ), thật hấp dẫn, kích thích vị giác bằng tiếng Việt cho món "${product_name}" thuộc danh mục "${category}"${
      base_price ? ` có giá ${Number(base_price).toLocaleString('vi-VN')}đ` : ''
    } tại nhà hàng RETASTE. Không dùng dấu ngoặc kép ở đầu/cuối câu.`;

    const aiText = await callGeminiInteraction({
      model: MODEL_FAST_TASK,
      input: prompt,
    });

    if (aiText && aiText.trim().length > 10) {
      return res.json({
        description: aiText.trim().replace(/^["']|["']$/g, ''),
        mode: 'gemini-3.5-flash-lite',
      });
    }

    // Fallback thông minh theo danh mục và tên món
    const lowerName = product_name.toLowerCase();
    let generated = '';
    if (category === 'Thức uống' || lowerName.includes('trà') || lowerName.includes('cà phê') || lowerName.includes('nước')) {
      generated = `${product_name} được pha chế từ nguyên liệu tươi tuyển chọn, hương vị thanh mát sảng khoái giúp đánh thức vị giác ngay từ ngụm đầu tiên.`;
    } else if (category === 'Combo' || lowerName.includes('combo')) {
      generated = `${product_name} kết hợp hài hòa giữa món chính đậm đà và thức uống giải nhiệt, lựa chọn trọn vẹn và tiết kiệm cho bữa ăn thêm phần hứng khởi.`;
    } else if (lowerName.includes('phở') || lowerName.includes('bún')) {
      generated = `${product_name} với phần nước dùng thanh ngọt ninh kỹ nhiều giờ, sợi bánh mềm dai hòa quyện cùng nguyên liệu tươi ngon nóng hổi chuẩn vị truyền thống.`;
    } else if (lowerName.includes('cơm')) {
      generated = `${product_name} gồm hạt cơm dẻo thơm nóng hổi ăn kèm topping tẩm ướp đậm đà, mang lại bữa ăn tròn vị và giàu dinh dưỡng.`;
    } else {
      generated = `${product_name} được chế biến tươi mới mỗi ngày theo công thức đặc trưng của RETASTE, hương vị đậm đà thơm ngon khó cưỡng.`;
    }

    return res.json({
      description: generated,
      mode: 'smart-hybrid',
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo mô tả món ăn', error: error.message });
  }
};

// ================= 4. AI PHÂN TÍCH DOANH THU & CỐ VẤN KINH DOANH CHO ADMIN =================
const analyzeBusinessData = async (req, res) => {
  try {
    const orders = await Order.find();
    const products = await Product.find();

    const completedOrders = orders.filter((o) => o.status === 'hoan_tat');
    const pendingOrders = orders.filter((o) => o.status === 'cho_duyet');
    const totalRevenue = completedOrders.reduce((s, o) => s + (o.total_amount || 0), 0);

    // Thống kê sản lượng từng món
    const dishStats = {};
    orders.forEach((o) => {
      if (o.status !== 'da_huy') {
        (o.items || []).forEach((it) => {
          const name = it.product_name || 'Món ăn';
          if (!dishStats[name]) {
            dishStats[name] = { name, quantity: 0, revenue: 0 };
          }
          dishStats[name].quantity += Number(it.quantity || 1);
          dishStats[name].revenue += Number(it.price || 0) * Number(it.quantity || 1);
        });
      }
    });

    const sortedDishes = Object.values(dishStats).sort((a, b) => b.quantity - a.quantity);
    const topDishes = sortedDishes.slice(0, 3);

    // Tỷ trọng thanh toán
    const codCount = orders.filter((o) => o.payment_method === 'cod' || !o.payment_method).length;
    const bankCount = orders.filter((o) => o.payment_method === 'bank').length;
    const momoCount = orders.filter((o) => o.payment_method === 'momo').length;

    const statsPrompt = `Phân tích dữ liệu kinh doanh nhà hàng RETASTE:
- Tổng số món trong menu: ${products.length}
- Tổng số đơn hàng: ${orders.length} (Hoàn tất: ${completedOrders.length}, Chờ duyệt: ${pendingOrders.length})
- Tổng doanh thu hoàn tất: ${totalRevenue} VNĐ
- Kênh thanh toán: COD (${codCount} đơn), VietQR (${bankCount} đơn), MoMo (${momoCount} đơn)
- Top món bán chạy: ${topDishes.map((d) => `${d.name} (${d.quantity} phần)`).join(', ') || 'Chưa có dữ liệu'}

Hãy trả về JSON gồm:
- "summary": Nhận xét tổng quan tình hình kinh doanh (2 câu ngắn gọn).
- "actionableTips": Mảng gồm đúng 3 gợi ý chiến lược cụ thể để tăng doanh thu (VD: ghép combo, đẩy mạnh thanh toán QR, tối ưu món bán chạy).`;

    const aiRaw = await callGeminiInteraction({
      model: MODEL_CHAT_AND_ANALYZE,
      input: statsPrompt,
      responseSchema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          actionableTips: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['summary', 'actionableTips'],
      },
    });

    if (aiRaw) {
      try {
        const parsed = JSON.parse(aiRaw.replace(/```json|```/g, '').trim());
        return res.json({
          summary: parsed.summary,
          topDishes,
          actionableTips: parsed.actionableTips,
          mode: 'gemini-4-hydrogen',
        });
      } catch {}
    }

    // Fallback phân tích số liệu trực tiếp chuẩn xác
    const topDishText =
      topDishes.length > 0
        ? `Món chủ lực đang dẫn đầu doanh số là "${topDishes[0].name}" với ${topDishes[0].quantity} phần được đặt.`
        : 'Hệ thống đang sẵn sàng ghi nhận các đơn đặt hàng mới từ thực khách.';

    const summary = `Nhà hàng hiện ghi nhận tổng cộng ${orders.length} đơn hàng với doanh thu hoàn tất đạt ${totalRevenue.toLocaleString(
      'vi-VN'
    )}đ trên quy mô ${products.length} món thực đơn. ${topDishText}`;

    const actionableTips = [
      topDishes.length > 0
        ? `Đẩy mạnh Combo: Kết hợp món bán chạy nhất "${topDishes[0].name}" cùng một thức uống giải nhiệt (như Trà Đào Cam Sả) giảm nhẹ 5.000đ - 10.000đ để tăng giá trị trung bình mỗi đơn hàng (AOV).`
        : 'Đánh dấu 3-4 món đặc trưng làm Best Seller để thuật toán gợi ý ưu tiên hiển thị trên trang chủ cho khách vãng lai.',
      bankCount + momoCount < codCount
        ? `Tối ưu thanh toán số: Hiện có ${codCount}/${orders.length} đơn dùng tiền mặt (COD). Khuyến khích khách quét mã VietQR hoặc MoMo để rút ngắn thời gian giao nhận và đối soát dòng tiền.`
        : `Tỷ lệ thanh toán không tiền mặt (VietQR & MoMo) đạt mức tích cực (${bankCount + momoCount} đơn), giúp tối ưu tốc độ vận hành quầy thu ngân.`,
      pendingOrders.length > 0
        ? `Vận hành tức thì: Hiện có ${pendingOrders.length} đơn hàng đang ở trạng thái "Chờ duyệt", nhân viên ca trực nên xác nhận sớm để nâng cao trải nghiệm khách hàng.`
        : 'Tất cả đơn hàng chờ duyệt đã được xử lý gọn gàng — hiệu suất phục vụ của ca trực đang rất tốt!',
    ];

    return res.json({
      summary,
      topDishes,
      actionableTips,
      mode: 'smart-hybrid',
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi phân tích kinh doanh bằng AI', error: error.message });
  }
};

module.exports = {
  chatWithAI,
  getSmartTimeRecommend,
  generateDishDescription,
  analyzeBusinessData,
};
