import express from 'express';
import cookieParser from 'cookie-parser';
import {PORT, SERVER_URL} from "./config/env.js";

import {authRouter} from "./routes/auth.routes.js";
import connectToDatabase from "./database/mongodb.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());


app.use('/api/auth', authRouter);

app.get('/', (req, res) => {
    res.send('Welcome to Webdeves Academy Api');
})

const startServer = async () => {
    try {
        await connectToDatabase();
        app.listen(PORT, () => {
            console.log(`Server is running at ${SERVER_URL}`);
        });
    } catch (error) {
        console.error("Database connection failed. Server not started", error);
        throw error
    }

};

startServer();