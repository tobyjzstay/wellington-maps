"use client";

import CircularProgress from "@mui/material/CircularProgress";
import { useLoadScript } from "@react-google-maps/api";
import Maps from "./maps";

function App() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  if (loadError) {
    return <div>Error loading maps</div>;
  }

  if (!isLoaded) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100vw",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </div>
    );
  }

  return <Maps />;
}

export default App;
