import jwt from "jsonwebtoken";
import { db } from "../libs/db.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.jwt;
    console.log("Token received:");
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized, no token provided",
      });
    }
    let decoded;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized, invalid token",
      });
    }

    const user = await db.user.findUnique({
      where:{
        id : decoded.id
      },
      select:{
        id: true,
        email: true,
        name: true,
        role: true,
        image: true
      }
    })

    if(!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user;
    next();

  } catch (error) {
    console.log("Error in auth middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const isAdmin = async (req, res, next)=>{
  try {
    
    const userId = req.user.id;

    const user = await db.user.findUnique({
      where:{
        id: userId
      },
      select:{
        role:true
      }
    })

    if(!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: "Forbidden, admin access required",
      });
    }

    next();

  } catch (error) {
    console.log("Error in isAdmin middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}