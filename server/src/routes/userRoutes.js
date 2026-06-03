import { Router } from 'express'
import { getUsers, getUser, postRegister, postLogin } from '../controllers/userController.js'

const router = Router()

router.get('/users', getUsers)
router.get('/users/:id', getUser)
router.post('/users/register', postRegister)
router.post('/users/login', postLogin)

export default router
