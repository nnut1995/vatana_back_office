"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Alert, Button, Snackbar } from "@mui/material";

type Notice = {
  key: number;
  message: string;
  severity: "success" | "error";
  action?: { label: string; onClick: () => void };
};

type Notify = (
  message: string,
  options?: { severity?: Notice["severity"]; action?: Notice["action"] },
) => void;

const FeedbackContext = createContext<Notify>(() => {});

/** Short confirmation after a save, e.g. "บันทึกแล้ว", with an optional Undo. */
export function useFeedback() {
  return useContext(FeedbackContext);
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const notify = useCallback<Notify>((message, options) => {
    setNotice({ key: Date.now(), message, severity: options?.severity ?? "success", action: options?.action });
  }, []);
  const close = () => setNotice(null);

  return (
    <FeedbackContext.Provider value={notify}>
      {children}
      <Snackbar
        key={notice?.key}
        open={!!notice}
        autoHideDuration={notice?.action ? 8000 : 4000}
        onClose={(_, reason) => reason !== "clickaway" && close()}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {notice ? (
          <Alert
            severity={notice.severity}
            variant="filled"
            onClose={close}
            sx={{ alignItems: "center", minWidth: 280 }}
            action={notice.action ? (
              <Button
                color="inherit"
                size="small"
                onClick={() => { close(); notice.action!.onClick(); }}
                sx={{ fontWeight: 700, minHeight: 36 }}
              >
                {notice.action.label}
              </Button>
            ) : undefined}
          >
            {notice.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </FeedbackContext.Provider>
  );
}
