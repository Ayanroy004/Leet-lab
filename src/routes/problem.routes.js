import express from 'express';
import { authMiddleware, isAdmin } from '../middleware/auth.middleware.js';
import { createProblem, deleteProblem, getAllProblem, getProblemById, getSolvedProblem, updateProblem } from '../controllers/problem.controller.js';


const problemRoutes = express.Router();

problemRoutes.post('/create',authMiddleware,isAdmin, createProblem)
problemRoutes.get('/get-all-problems',authMiddleware, getAllProblem)
problemRoutes.get('/get-problem/:id',authMiddleware, getProblemById)

problemRoutes.put('/update-problem/:id',authMiddleware,isAdmin, updateProblem)

problemRoutes.delete('/delete-problem/:id',authMiddleware,isAdmin, deleteProblem)
problemRoutes.get('/get-solved-problem',authMiddleware, getSolvedProblem)


export default problemRoutes;