import { useState, useEffect } from "react";
import React from "react";
import { CgPacman } from "react-icons/cg";
import { FaCircle } from "react-icons/fa";
import { FiZap, FiClock, FiRefreshCw, FiCode } from "react-icons/fi";
import axios from "axios";

const App = () => {
  const [firstpage, SetFirstpage] = useState(true);
  const [path, setPath] = useState("/posts");
  const [firstTime, setFirstTime] = useState(null); // cold
  const [cacheTimes, setCacheTimes] = useState([]); // list of warm times
  const [responseData, setResponseData] = useState(null);
  const [cacheStatus, setCacheStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasFetchedFirst, setHasFetchedFirst] = useState(false);

  const PROXY_API = import.meta.env.VITE_API_URL;

  const handleFirstFetch = async () => {
    setLoading(true);
    try {
      const start = performance.now();
      const res = await axios.get(`${PROXY_API}${path}`);
      const end = performance.now();
      setFirstTime(Math.round(end - start));
      setResponseData(res.data);
      setHasFetchedFirst(true);
    } catch (err) {
      console.error("Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCacheFetch = async () => {
    setLoading(true);
    try {
      const start = performance.now();
      const res = await axios.get(`${PROXY_API}${path}`);
      const end = performance.now();
      const time = Math.round(end - start);
      setCacheTimes((prev) => [time, ...prev.slice(0, 9)]); // keep last 10
      setCacheStatus(time);
      setResponseData(res.data);
    } catch (err) {
      console.error("Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const startServer = async () => {
      try {
        const res = await axios.get(`${PROXY_API}/start`);
        if (res) {
          SetFirstpage(false);
        }
      } catch (error) {
        throw error;
      }
    };
    startServer();
  }, []);

  if (firstpage) {
    return (
      <div className="bg-black/[.8] w-screen h-screen absolute flex items-center justify-center">
        <div className="flex flex-col justify-center items-center">
          <div className="h-8 animate-bounce">
            <FaCircle className="text-red-500 text-[20px] border-2 p-1 rounded-full border-white" />
          </div>

          <p className="w-112 text-white">
            The VM is sleeping! Since this is a free server, it takes a few
            seconds to wake up. Thanks for being the one to start it up! ⚡
          </p>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="min-h-screen bg-gray-300 text-white p-6">
        <div className="max-w-5xl mx-auto bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-800">
          <h1 className="text-3xl font-bold mb-4 text-center text-blue-100 flex justify-center items-center gap-2">
            <FiZap /> Cache Performance Tester (For blog post)
          </h1>

          <div className="flex flex-col gap-4 mb-6 items-center">
            <input
              type="text"
              className="border border-gray-700  bg-gray-800 p-4 rounded text-2xl w-full max-w-xl text-white placeholder-gray-400"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/posts"
              disabled
            />
            {!hasFetchedFirst ? (
              <button
                onClick={handleFirstFetch}
                className="bg-red-600 text-white cursor-pointer px-6 py-3 rounded hover:bg-red-700 w-[250px] flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <FiRefreshCw className="animate-spin" />
                ) : (
                  <FiClock />
                )}
                {loading ? "Fetching..." : "Fetch First Time"}
              </button>
            ) : (
              <button
                onClick={handleCacheFetch}
                className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 w-[280px] flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? <FiRefreshCw className="animate-spin" /> : <FiZap />}
                {loading ? "Testing..." : "Test Cache Performance"}
              </button>
            )}
          </div>

          <div className="flex gap-6 justify-between">
            <div className="w-full md:w-1/2 flex flex-col items-start">
              {firstTime !== null && (
                <div className="mb-4">
                  <p className="font-semibold text-gray-300 text-lg">
                    ❄️ First Fetch (no cache):{" "}
                    <span className="text-red-400">{firstTime} ms</span>
                  </p>
                </div>
              )}

              {cacheTimes.length > 0 && (
                <div className="mb-4">
                  <p className="font-semibold text-gray-300 text-lg">
                    🧠 Cache Hits:
                  </p>
                  <ul className="list-disc ml-6 text-blue-400 text-sm mt-2">
                    {cacheTimes.map((t, i) => (
                      <li key={i}>
                        Request {i + 1}: {t} ms
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-gray-400 text-sm">
                    Last cache status:{" "}
                    <span className="text-yellow-300">{cacheStatus}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="w-full md:w-1/2">
              {responseData && (
                <>
                  <h2 className="font-semibold mb-2 text-gray-300 flex items-center gap-1">
                    <FiCode /> Response:
                  </h2>
                  <pre className="bg-[#0d1117] text-green-400 p-4 rounded-lg overflow-auto text-xs h-[300px] w-full border border-gray-800">
                    {JSON.stringify(responseData, null, 2)}
                  </pre>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default App;
