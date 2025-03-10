"use client";

import { motion } from "framer-motion";
import { RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";
import { useNetworkInfo } from "@/app/lib/hooks";
import Card from "./ui/card";
import { CardContent } from "./ui/card";
import Button from "./ui/button";
import { NetworkSkeletonLoader } from "./ui/skeletons";
import { NetworkInfo as NetworkInfoType } from "@/app/types/speed";

export default function NetworkInfo() {
  const { networkInfo, loading, refreshing, refreshNetworkInfo } =
    useNetworkInfo();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy");
      console.error("Copy failed:", err);
    }
  };

  if (loading) {
    return <NetworkSkeletonLoader />;
  }

  if (!networkInfo) {
    return (
      <Card className="shadow-md border-gray-800 bg-black/30 backdrop-blur-md">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-200">Network Info</h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
              onClick={refreshNetworkInfo}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            Unable to retrieve network information.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-gray-800 bg-black/30 backdrop-blur-md">
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-200">Network Info</h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
            onClick={refreshNetworkInfo}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Provider:</span>
            <span className="text-gray-200">{networkInfo.provider}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Location:</span>
            <span className="text-gray-200">
              {networkInfo.location?.city
                ? `${networkInfo.location.city}, ${networkInfo.location.country}`
                : "Unknown"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">IP Address:</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-200">{networkInfo.ip}</span>
              <button
                onClick={() => copyToClipboard(networkInfo.ip)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Copy IP address"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
