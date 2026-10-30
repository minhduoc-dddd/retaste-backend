const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  loginUser, 
  getAllUsers, 
  updateUserRole 
} = require('../controllers/userController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/', getAllUsers);
router.put('/:id/role', updateUserRole);

module.exports = router;