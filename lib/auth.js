const { clerkClient } = require('@clerk/clerk-sdk-node');


const extractToken = (authHeader) => {
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
        throw new Error('No valid authorization token provided.');
    }
    return authHeader.split('Bearer ')[1];
};
const verifyToken = async (req) => {
    const token = extractToken(req.headers.authorization);

    try {
        const decodedClerk = await clerkClient.verifyToken(token);
        
        console.log('✅ Token verified successfully by CLERK.');
        return {
            uid: decodedClerk.sub, 
            clerkUserId: decodedClerk.sub,
            source: 'clerk',
            ...decodedClerk,
        };
    } catch (clerkError) {
        // console.log('Clerk verification failed:', clerkError.message);
    }
    try {
        const { auth } = require('./firebase');
        const decodedFirebase = await auth.verifyIdToken(token);
        
        console.log('✅ Token verified successfully by FIREBASE.');
        return {
            uid: decodedFirebase.uid,
            source: 'firebase',
            ...decodedFirebase,
        };
    } catch (firebaseError) {
        console.error('❌ Final Authentication Failure (neither source verified):', firebaseError.message);
        // If neither worked, throw a final error
        throw new Error('Authentication failed: Invalid, expired, or unrecognized token.');
    }
};

module.exports = { verifyToken };