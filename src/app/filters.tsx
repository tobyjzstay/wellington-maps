import {
  Box,
  Checkbox,
  Divider,
  FormControlLabel,
  FormGroup,
  Paper,
} from "@mui/material";
import React from "react";
import styles from "./filters.module.css";
import { MapContext } from "./maps";

export type Visibility = {
  rail: boolean;
  frequent: boolean;
  standard: boolean;
  peakExpressExtended: boolean;
  midnight: boolean;
  ferry: boolean;
  cableCar: boolean;
  schoolBus: boolean;
  vehicleType: boolean;
};

export function Filters() {
  const { map, setVisibility, visibility } = React.useContext(MapContext);

  if (!map) return null;
  return (
    <Paper className={styles["filters-paper"]}>
      <FormGroup className={styles["filters-options"]}>
        <FormControlLabel
          control={
            <Checkbox
              checked={visibility.rail}
              onChange={() =>
                setVisibility((prev) => ({ ...prev, rail: !prev.rail }))
              }
              size="small"
            />
          }
          label="Rail"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={
                visibility.frequent &&
                visibility.standard &&
                visibility.peakExpressExtended &&
                visibility.midnight &&
                visibility.schoolBus
              }
              indeterminate={
                (visibility.frequent ||
                  visibility.standard ||
                  visibility.peakExpressExtended ||
                  visibility.midnight ||
                  visibility.schoolBus) &&
                !(
                  visibility.frequent &&
                  visibility.standard &&
                  visibility.peakExpressExtended &&
                  visibility.midnight &&
                  visibility.schoolBus
                )
              }
              onChange={() => {
                const state =
                  visibility.frequent ||
                  visibility.standard ||
                  visibility.peakExpressExtended ||
                  visibility.midnight ||
                  visibility.schoolBus;
                setVisibility((prev) => ({
                  ...prev,
                  frequent: !state,
                  standard: !state,
                  peakExpressExtended: !state,
                  midnight: !state,
                  schoolBus: !state,
                }));
              }}
              size="small"
            />
          }
          label="Bus"
        />
        <Box className={styles["filters-options-bus"]}>
          <FormControlLabel
            control={
              <Checkbox
                checked={visibility.frequent}
                onChange={() =>
                  setVisibility((prev) => ({
                    ...prev,
                    frequent: !prev.frequent,
                  }))
                }
                size="small"
              />
            }
            label="Frequent"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={visibility.standard}
                onChange={() =>
                  setVisibility((prev) => ({
                    ...prev,
                    standard: !prev.standard,
                  }))
                }
                size="small"
              />
            }
            label="Standard"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={visibility.peakExpressExtended}
                onChange={() =>
                  setVisibility((prev) => ({
                    ...prev,
                    peakExpressExtended: !prev.peakExpressExtended,
                  }))
                }
                size="small"
              />
            }
            label="Peak, Express, Extended"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={visibility.midnight}
                onChange={() =>
                  setVisibility((prev) => ({
                    ...prev,
                    midnight: !prev.midnight,
                  }))
                }
                size="small"
              />
            }
            label="Midnight"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={visibility.schoolBus}
                onChange={() =>
                  setVisibility((prev) => ({
                    ...prev,
                    schoolBus: !prev.schoolBus,
                  }))
                }
                size="small"
              />
            }
            label="School"
          />
        </Box>
        <FormControlLabel
          control={
            <Checkbox
              checked={visibility.ferry}
              onChange={() =>
                setVisibility((prev) => ({
                  ...prev,
                  ferry: !prev.ferry,
                }))
              }
              size="small"
            />
          }
          label="Ferry"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={visibility.cableCar}
              onChange={() =>
                setVisibility((prev) => ({
                  ...prev,
                  cableCar: !prev.cableCar,
                }))
              }
              size="small"
            />
          }
          label="Cable Car"
        />
        <Divider />
        <FormControlLabel
          className={styles["filters-options-other"]}
          control={
            <Checkbox
              checked={visibility.vehicleType}
              onChange={() =>
                setVisibility((prev) => ({
                  ...prev,
                  vehicleType: !prev.vehicleType,
                }))
              }
              size="small"
            />
          }
          label="Vehicle Type"
        />
      </FormGroup>
    </Paper>
  );
}
