import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import githubAuthRoute from './routes/github/auth.js';
import githubResumeRoute from './routes/github/resume.js';
import listsRoute from './routes/mysql/lists.js';
import profileRoute from './routes/mysql/profile.js';

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
// app.use('/github/resume', githubResumeRoute);
app.use('/list', listsRoute);
app.use('/profile',profileRoute);


app.listen(port, () => {
    console.log(`Server Started at ${port}`)
})