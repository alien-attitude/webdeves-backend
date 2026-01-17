import {Router} from "express";
import {signUp, signIn, signOut, refreshToken, forgotPassword, resetPassword} from "../controllers/auth.controller.js";

export const authRouter = Router();

authRouter.post("/signup", signUp);
authRouter.post("/signin", signIn);
authRouter.post("/refresh", refreshToken);
authRouter.post("/signout", signOut);
authRouter.post("/forgot-password", forgotPassword)
authRouter.post("/reset-password", resetPassword)