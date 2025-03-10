import { NextResponse } from 'next/server';

// Test file sizes in bytes
const FILE_SIZES = {
    tiny: 100 * 1024, // 100KB
    small: 1 * 1024 * 1024, // 1MB
    medium: 10 * 1024 * 1024, // 10MB
    large: 25 * 1024 * 1024, // 25MB
};

export async function GET(request: Request) {
    // Get the size parameter from the URL
    const url = new URL(request.url);
    const sizeParam = url.searchParams.get('size') || 'small';

    // Determine file size to generate
    const fileSize = FILE_SIZES[sizeParam as keyof typeof FILE_SIZES] || FILE_SIZES.small;

    // Generate random binary data of specified size
    const buffer = new ArrayBuffer(fileSize);
    const view = new Uint8Array(buffer);

    // Fill with random data
    for (let i = 0; i < view.length; i++) {
        view[i] = Math.floor(Math.random() * 256);
    }

    // Create a response with appropriate headers for accurate testing
    return new NextResponse(buffer, {
        headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': fileSize.toString(),
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        },
    });
} 