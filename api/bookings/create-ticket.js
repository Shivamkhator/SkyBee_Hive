// api/bookings/create-ticket.js (Conceptual Backend Logic)

const { verifyToken } = require('../../lib/auth');
const { db } = require('../../lib/firebase');
const allowCors = require('../../lib/cors');

const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const user = await verifyToken(req);
        const { eventId, paymentId, eventTitle } = req.body;

        // 1. Check if the user is already booked (prevent double booking)
        const bookingRef = db.collection('event_bookings').doc(`${user.uid}_${eventId}`);
        const bookingDoc = await bookingRef.get();

        if (bookingDoc.exists) {
            return res.status(409).json({ success: false, message: 'Ticket already booked for this event.' });
        }

        // 2. Create the final booking record
        await bookingRef.set({
            userId: user.uid,
            eventId: eventId,
            eventTitle: eventTitle,
            paymentId: paymentId, // Link back to the payment transaction
            bookedAt: new Date(),
            status: 'BOOKED',
        });

        console.log(`✅ Ticket booked for User ${user.uid} to Event ${eventId}`);

        res.json({ success: true, message: 'Ticket booking successfully recorded.' });

    } catch (error) {
        console.error('❌ Ticket booking failed:', error);
        res.status(500).json({ error: 'Failed to record booking.' });
    }
};

module.exports = allowCors(handler);