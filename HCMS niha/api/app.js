export default function handler(req, res) {
    return res.status(200).json({
        success: true,
        message: 'API is working with pure JavaScript',
        timestamp: new Date().toISOString()
    });
}
