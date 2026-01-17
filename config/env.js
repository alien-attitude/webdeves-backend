import {config} from "dotenv";

config({path: `.env.${process.env.NODE_ENV || "development"}.local`})

export const {
    PORT,
    NODE_ENV,
    DB_URI,
    SERVER_URL,
    ACCESS_TOKEN_EXPIRES_IN, ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET, REFRESH_TOKEN_EXPIRES_IN
} = process.env