// Get the WebSocketMarbleRenderer from the global SvgMarblesWebSocket object
const { WebSocketMarbleRenderer } = SvgMarblesWebSocket;

let renderer;
const streams = new Map();

window.connect = function () {
  if (renderer) {
    renderer.disconnect();
  }

  const canvas = document.getElementById("marbleCanvas");
  renderer = new WebSocketMarbleRenderer(canvas, {
    url:
      (window.location.protocol === "https:" ? "wss://" : "ws://") +
      window.location.host +
      "/ws",
    theme: {
      backgroundColor: "#111827",
      lineColor: "#4B5563",
      valueColor: "#10B981",
      errorColor: "#EF4444",
      completeColor: "#3B82F6",
      textColor: "#F3F4F6",
      circleRadius: 18
    },
    streamThemes: {
      // Custom colors for specific streams
      "interval-1s": {
        valueColor: "#F59E0B", // Amber for interval stream
        lineColor: "#92400E"
      },
      random: {
        valueColor: "#8B5CF6", // Purple for random stream
        lineColor: "#5B21B6"
      },
      merged: {
        valueColor: "#06B6D4", // Cyan for merged stream
        lineColor: "#164E63"
      },
      "error-demo": {
        valueColor: "#EC4899", // Pink for error demo
        errorColor: "#BE185D"
      },
      fibonacci: {
        valueColor: "#10B981", // Green for fibonacci
        lineColor: "#065F46"
      },
      accelerating: {
        valueColor: "#F97316", // Orange for accelerating
        lineColor: "#7C2D12"
      }
    },
    scrollSpeed: 60,
    maxDuration: 40000
  });
  renderer.connect();

  updateStatus("Connected");
  displayAvailableStreams();

  document.getElementById("connectBtn").disabled = true;
  document.getElementById("disconnectBtn").disabled = false;
};

window.disconnect = function () {
  if (renderer) {
    renderer.disconnect();
  }
  updateStatus("Disconnected");
  document.getElementById("streamsList").innerHTML =
    '<p class="text-gray-400 col-span-full">Connect to see available streams...</p>';
  document.getElementById("connectBtn").disabled = false;
  document.getElementById("disconnectBtn").disabled = true;
};

window.clearCanvas = function () {
  if (renderer) {
    renderer.clear();
  }
};

window.subscribeToStream = function (streamId) {
  if (renderer) {
    renderer.subscribe(streamId);
    streams.set(streamId, true);
    updateStreamButtons();
  }
};

window.unsubscribeFromStream = function (streamId) {
  if (renderer) {
    renderer.unsubscribe(streamId);
    streams.delete(streamId);
    updateStreamButtons();
  }
};

function updateStatus(status) {
  const statusText = document.getElementById("statusText");
  const statusIndicator = document.getElementById("statusIndicator");
  statusText.textContent = status;
  if (status === "Connected") {
    statusIndicator.className = "w-3 h-3 rounded-full bg-green-500";
  } else {
    statusIndicator.className = "w-3 h-3 rounded-full bg-red-500";
  }
}

function displayAvailableStreams() {
  fetch("/api/streams")
    .then((res) => res.json())
    .then((data) => {
      const container = document.getElementById("streamsList");
      container.innerHTML = data.streams
        .map(
          (stream) => `
        <div class="p-4 bg-gray-700 rounded">
          <h3 class="font-bold mb-1">${stream.name}</h3>
          <p class="text-sm text-gray-300 mb-3">${stream.description}</p>
          <div class="flex gap-2">
            <button 
              id="sub-${stream.streamId}"
              class="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
              onclick="subscribeToStream('${stream.streamId}')"
            >Subscribe</button>
            <button 
              id="unsub-${stream.streamId}"
              class="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
              onclick="unsubscribeFromStream('${stream.streamId}')"
              style="display: none;"
            >Unsubscribe</button>
          </div>
        </div>
      `
        )
        .join("");
    });
}

function updateStreamButtons() {
  streams.forEach((_, streamId) => {
    const subBtn = document.getElementById(`sub-${streamId}`);
    const unsubBtn = document.getElementById(`unsub-${streamId}`);
    if (subBtn) subBtn.style.display = "none";
    if (unsubBtn) unsubBtn.style.display = "block";
  });
}

console.log("WebSocket marble demo loaded");
console.log(
  "WebSocket endpoint:",
  window.location.protocol === "https:"
    ? "wss://"
    : "ws://" + window.location.host + "/ws"
);
