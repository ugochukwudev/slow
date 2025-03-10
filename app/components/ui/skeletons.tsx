"use client";

import React from "react";

export function NetworkSkeletonLoader() {
    return (
        <div className="shadow-md border border-gray-800 bg-black/30 backdrop-blur-md rounded-lg p-4">
            <div className="flex justify-between items-center">
                <div className="h-5 w-32 bg-gray-700 rounded animate-pulse"></div>
                <div className="h-6 w-6 bg-gray-700 rounded-full animate-pulse"></div>
            </div>
            <div className="mt-4 space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex justify-between items-center">
                        <div className="h-4 w-24 bg-gray-700 rounded animate-pulse"></div>
                        <div className="h-4 w-40 bg-gray-700 rounded animate-pulse"></div>
                    </div>
                ))}
            </div>
        </div>
    );
} 