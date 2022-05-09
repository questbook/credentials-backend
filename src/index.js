import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import githubAuthRoute from './routes/github/auth.js';
import githubResumeRoute from './routes/github/resume.js';
import enumsRoute from './routes/mysql/enums.js';

const {json, urlencoded} = express;
const port = process.env.PORT;

const corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200,
}

const app = express();
app.use(cors(corsOptions));
app.use(json());
app.use(urlencoded());

app.use('/github/auth', githubAuthRoute);
app.use('/github/resume', githubResumeRoute);
app.use('/enum', enumsRoute);

app.listen(port, () => {
    console.log(`Server Started at ${port}`)
})