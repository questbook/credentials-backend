import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import githubAuthRoute from '../src/routes/github/auth';
import githubResumeRoute from '../src/routes/github/resume';
import enumsRoute from '../src/routes/mysql/enums';

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