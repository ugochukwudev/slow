import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        // Read the request body
        const blob = await request.blob();
        const fileSize = blob.size;

        // Validate the upload worked correctly
        if (!fileSize || fileSize <= 0) {
            return NextResponse.json(
                { error: 'Invalid file upload' },
                { status: 400 }
            );
        }

        // Return the size for validation on client side
        return NextResponse.json({
            success: true,
            receivedBytes: fileSize,
            message: 'Upload test successful',
        });
    } catch (error) {
        console.error('Upload test error:', error);
        return NextResponse.json(
            { error: 'Failed to process upload test' },
            { status: 500 }
        );
    }
}

// Allow OPTIONS requests for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
} 