import mongoose from 'mongoose';
import User from '../schemas/user.schema.js';
import bcrypt from 'bcrypt';
import {signAccessToken, signRefreshToken} from "../utils/token.js";
import jwt from 'jsonwebtoken';
import {generateOTP} from "../utils/otp.js";


export const signUp = async (req, res, next) => {
 const session = await mongoose.startSession();

 try {
   await session.withTransaction(async () => {
     const { username, first_name, last_name, email, phone_number, password } = req.body;

     if (!email || !password) {
       const error = new Error('Please provide email and password');
       error.statusCode = 400;
       throw error;
     }

     if (password.length < 8) {
       const error = new Error('Password must be at least 8 characters long');
       error.statusCode = 400;
       throw error;
     }

     const existingUser = await User.findOne({ email }).session(session);
     if (existingUser) {
       const error = new Error('User already exists');
       error.statusCode = 409;
       throw error;
     }

     const hashedPassword = await bcrypt.hash(password, 12);

     const [newUser] = await User.create(
       [{
         username,
         first_name,
         last_name,
         email,
         phone_number,
         password: hashedPassword,
       }],
       { session }
     );

     const payload = {
         user: newUser._id
     };

     const accessToken = signAccessToken(payload);
     const refreshToken = signRefreshToken(payload);

     res.cookie("accessToken", accessToken, {
       httpOnly: true,
       secure: false, // set to true in production with HTTPS
       sameSite: "strict",
       maxAge: 1000 * 60 * 60 * 24
     });

     res.cookie("refreshToken", refreshToken, {
       httpOnly: true,
       secure: false,
       sameSite: "strict",
       maxAge: 1000 * 60 * 60 * 24 * 7
     });

     const safeUser = newUser.toObject();
     delete safeUser.password

     res.status(200).json({
       success: true,
       message: 'User created successfully',
       data: {
         accessToken,
           refreshToken,
         user: safeUser
       }
     });
   });
 } catch (error) {
   next(error);
 } finally {
   await session.endSession();
 }
};

export const signIn = async (req, res, next) => {
    try {
        const {email, username, password} = req.body;

        // Require either username or email and password
        if ((!email && !username) || !password) {
            const error = new Error('Please provide email or username and password');
            error.statusCode = 400;
            throw error;
        }

        // Build query depending on what is required
        const query = email ? { email } : { username };

        const user = await User.findOne(query).select('+password');

        // Check if user is present
        if (!user) {
            const error = new Error('Invalid credentials');
            error.statusCode = 401;
            throw error;
        }

        // Validate user password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            const error = new Error('Invalid password');
            error.statusCode = 401;
            throw error;
        }

        const payload = {
            user: user._id
        }

        const accessToken = signAccessToken(payload);
        const refreshToken = signRefreshToken(payload);

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure:false,
            sameSite: "strict",
            maxAge: 1000 * 60 * 60 * 24
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure:false,
            sameSite: "strict",
            maxAge: 1000 * 60 * 60 * 24 * 7
        })

   const safeUser = user.toObject();
   delete safeUser.password;

   res.status(200).json({
     success: true,
     message: 'User logged in successfully',
     data: {
       accessToken,
         refreshToken,
       user: safeUser
     }
   });
    } catch (error) {
        next(error)
    }
}

// Refresh token endpoint
export const refreshToken = async (req, res) => {
    const token = req.cookies.refreshToken;

    if (!token) {
        return res.status(401).json({ message: "Access denied. unauthorized" });
    }

    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Refresh token is not valid" });
        }

        const newAccessToken = signAccessToken({ userId: decoded.user });

        res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure:false,
            sameSite: "strict",
            maxAge: 1000 * 60 * 60 * 24
        });

        return res.status(200).json({
            message: "Token refreshed successfully",
        });
    });
}

export const signOut = async (req, res) => {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.status(200).json({ message: "Logged out successfully" });
};

// forgot password
export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            const error = new Error('Please provide email');
            error.statusCode = 400;
            throw error;
        }
        
        const user = await User.findOne({ email })
        
        if (!user) {
            return res.status(200).json({ 
                success: true,
                message: "If an account exists with the provided email address, an OTP has been sent"  
            });
        }
        
        const otp = generateOTP();
        const expiresInMinutes = 10;
        const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
        
        user.resetPasswordOtp = otp;
        user.resetPasswordExpiresAt = expiresAt;    
        
        await user.save();

        // TODO: integrate with your email/SMS service here.

        // for debugging purpose
        console.log(`Password reset OTP for ${user.email}: ${otp}`);

        return res.status(200).json({
            success: true,
            message: 'If an account with that email exists, an OTP has been sent'
        });

    } catch (error) {
        console.error('Error in forgotPassword', error);
        if(!error.statusCode) {
            error.statusCode = 500;
            error.message = 'Internal server error';
        }
        next(error);
    }
}

// passsword reset
export const resetPassword = async (req, res, next) => {
    try {
        const { email, otp, newPassword } = req.body;
        
        if (!email || !otp || !newPassword) {
            const error = new Error('Email, OTP and new password are required');
            error.statusCode = 400;
            throw error;
        }
        
        if (newPassword.length < 8) {
            const error = new Error('New password must be at least 8 characters long');
            error.statusCode = 400;
            throw error;
        }
        
        // Otp fields are needed, so explicitly select them
        const user = await User.findOne({ email }).select('+resetPasswordOtp +resetPasswordExpiresAt +password');
        
        if (!user) {
            const error = new Error('Invalid OTP or expired');
            error.statusCode = 400;
            throw error;
        }
        
        if (!user.resetPasswordOtp || !user.resetPasswordExpiresAt) {
            const error = new Error('Invalid OTP or expired');
            error.statusCode = 400;
            throw error;
        }

        const now = new Date();

        const isOtpValid = user.resetPasswordOtp === otp && user.resetPasswordExpiresAt > now;

        if (!isOtpValid) {
            const error = new Error('Invalid OTP or expired');
            error.statusCode = 400;
            throw error;
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        
        // Clear OTP info so it can't be reused
        user.resetPasswordOtp = undefined;
        user.resetPasswordExpiresAt = undefined
        
        await user.save();
        
        return res.status(200).json({
            success: true,
            message: "Password reset successful" });
    } catch (error) {
        console.error('Error in resetPassword', error);
        if (!error.statusCode) {
            error.statusCode = 500;
            error.message = 'Internal server error';
        }
        next(error);
    }
}