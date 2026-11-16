const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('crypto');

function getFirebaseAdminApp() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON environment variable.');
  const serviceAccount = JSON.parse(raw);
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Authentication required.' });

    const app = getFirebaseAdminApp();
    const decoded = await getAuth(app).verifyIdToken(token);
    const adminSnapshot = await getFirestore(app).collection('admins').doc(decoded.uid).get();
    if (!adminSnapshot.exists || adminSnapshot.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin permission required.' });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) throw new Error('Cloudinary environment variables are incomplete.');

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'misa/products';
    const signatureBase = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto.createHash('sha1').update(signatureBase + apiSecret).digest('hex');
    return res.status(200).json({ cloud_name: cloudName, api_key: apiKey, timestamp, folder, signature });
  } catch (error) {
    console.error('Cloudinary signing error:', error);
    return res.status(500).json({ error: 'Unable to authorize image upload. Check Vercel environment variables and Firebase service account.' });
  }
};
