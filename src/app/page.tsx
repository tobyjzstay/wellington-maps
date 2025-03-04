"use client";

import { Libraries, LoadScript } from "@react-google-maps/api";
import Maps from "./maps";

const libraries: Libraries = ["marker"];

function App() {
  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
      libraries={libraries}
    >
      <Maps />
    </LoadScript>
  );
}

export default App;
