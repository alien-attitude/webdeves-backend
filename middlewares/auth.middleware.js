
import jwt from "jsonwebtoken";

export const authenticate = (req, res, next) => {
    try {
        const token = req.cookie.accessToken;

        if (!token) {
            res.status(401).json({message: "unauthorized"});
        }

        jwt.sign(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({message: `forbidden: ${err}`});
            }

            req.user = decoded;
        })
    } catch (error) {
        next(error)
    }
}