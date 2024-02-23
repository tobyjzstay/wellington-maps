"use client";

import { Status, Wrapper } from "@googlemaps/react-wrapper";
import CircularProgress from "@mui/material/CircularProgress";
import Maps from "./maps";

function App() {
  const render = (status: Status): React.ReactElement => {
    if (status === Status.FAILURE) return <div>Error loading maps</div>;
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
  };

  return (
    <Wrapper
      apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
      render={render}
    >
      <Maps />
    </Wrapper>
  );
}

export default App;
