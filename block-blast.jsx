import React, { useState, useRef, useCallback, useEffect } from "react";
import { Palette, RefreshCw, Trophy, Sparkles } from "lucide-react";

/* ----------------------------- GAME CONSTANTS ---------------------------- */

const BOARD_SIZE = 8;

// Piece shapes as [row, col] offsets from top-left of bounding box.
const SHAPES = [
  [[0, 0]], // dot
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1]], // 2x2 square
  [
    [0, 0], [0, 1], [0, 2],
    [1, 0], [1, 1], [1, 2],
    [2, 0], [2, 1], [2, 2],
  ], // 3x3 square
  [[0, 0], [1, 0], [2, 0], [2, 1]], // L
  [[0, 0], [0, 1], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 1], [1, 1], [2, 0], [2, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 2]],
  [[1, 0], [1, 1], [1, 2], [0, 0]],
  [[1, 0], [1, 1], [1, 2], [0, 2]],
  [[0, 0], [0, 1], [0, 2], [1, 1]], // T
  [[0, 1], [1, 0], [1, 1], [2, 1]],
  [[1, 0], [1, 1], [1, 2], [0, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 0]],
  [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]], // plus
  [[0, 0], [0, 1], [1, 1], [1, 2]], // Z
  [[0, 1], [0, 2], [1, 0], [1, 1]], // S
  [[0, 0], [0, 1], [1, 0]],
  [[0, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [1, 1]],
  [[0, 1], [1, 0], [1, 1]],
];

const THEMES = {
  classic: {
    label: "Classic",
    bg: "linear-gradient(150deg, #0c0e22 0%, #161a3a 55%, #0e1130 100%)",
    panel: "#12152f",
    panelBorder: "rgba(255,255,255,0.07)",
    boardBg: "#0a0c1f",
    cellEmpty: "rgba(255,255,255,0.045)",
    cellBorder: "rgba(255,255,255,0.06)",
    colors: ["#ff5470", "#21e6c1", "#ffd23f", "#5b8cff", "#c65bff", "#ff9f45"],
    radius: 5,
    pieceRadius: 5,
    textPrimary: "#f3f4ff",
    textMuted: "rgba(243,244,255,0.55)",
    accent: "#21e6c1",
    displayFont: "'Russo One', 'Arial Black', sans-serif",
    bodyFont: "'Inter', system-ui, sans-serif",
    blockShadow: "inset 0 -3px 0 rgba(0,0,0,0.28), inset 0 2px 0 rgba(255,255,255,0.25)",
    pieceTrayBg: "rgba(255,255,255,0.03)",
    googleFont:
      "@import url('https://fonts.googleapis.com/css2?family=Russo+One&family=Inter:wght@400;600;700;800&display=swap');",
  },
  material3: {
    label: "Material 3 Expressive",
    bg: "linear-gradient(160deg, #fef7ff 0%, #f3edf9 60%, #ece6f4 100%)",
    panel: "#ffffff",
    panelBorder: "rgba(103,80,164,0.12)",
    boardBg: "#ece6f4",
    cellEmpty: "#ffffff",
    cellBorder: "rgba(103,80,164,0.10)",
    colors: ["#7C5CFC", "#00B295", "#FF8A3D", "#3D7BFF", "#FF5C9C", "#5BAE2E"],
    radius: 18,
    pieceRadius: 14,
    textPrimary: "#1d1b27",
    textMuted: "rgba(29,27,39,0.55)",
    accent: "#7C5CFC",
    displayFont: "'Roboto Flex', 'Google Sans', 'Roboto', sans-serif",
    bodyFont: "'Roboto Flex', 'Roboto', system-ui, sans-serif",
    blockShadow: "0 4px 10px rgba(103,80,164,0.30)",
    pieceTrayBg: "rgba(103,80,164,0.05)",
    googleFont:
      "@import url('https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wght@8..144,400..900&display=swap');",
  },
};

/* ------------------------------- HELPERS --------------------------------- */

const emptyBoard = () =>
  Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));

let idCounter = 1;
const nextId = () => idCounter++;

const randomPiece = (colorCount) => {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const colorIndex = Math.floor(Math.random() * colorCount);
  return { id: nextId(), cells: shape, colorIndex };
};

const generateTray = (colorCount) => [
  randomPiece(colorCount),
  randomPiece(colorCount),
  randomPiece(colorCount),
];

const pieceDims = (cells) => {
  let w = 0,
    h = 0;
  cells.forEach(([r, c]) => {
    if (r + 1 > h) h = r + 1;
    if (c + 1 > w) w = c + 1;
  });
  return { w, h };
};

const canPlace = (board, cells, anchorRow, anchorCol) =>
  cells.every(([r, c]) => {
    const rr = anchorRow + r;
    const cc = anchorCol + c;
    return (
      rr >= 0 &&
      rr < BOARD_SIZE &&
      cc >= 0 &&
      cc < BOARD_SIZE &&
      board[rr][cc] === null
    );
  });

const canFitAnywhere = (board, cells) => {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (canPlace(board, cells, r, c)) return true;
    }
  }
  return false;
};

const findFullLines = (board) => {
  const rows = [];
  const cols = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (board[r].every((cell) => cell !== null)) rows.push(r);
  }
  for (let c = 0; c < BOARD_SIZE; c++) {
    if (board.every((row) => row[c] !== null)) cols.push(c);
  }
  return { rows, cols };
};

/* -------------------------------- COMPONENT ------------------------------- */

export default function BlockBlast() {
  const [themeKey, setThemeKey] = useState("classic");
  const theme = THEMES[themeKey];

  const [board, setBoard] = useState(emptyBoard);
  const [tray, setTray] = useState(() => generateTray(THEMES.classic.colors.length));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [flashCells, setFlashCells] = useState([]); // cells currently animating out
  const [ghost, setGhost] = useState(null); // {cells, anchorRow, anchorCol, valid, colorIndex}
  const [toast, setToast] = useState(null);

  const boardRef = useRef(null);
  const dragRef = useRef(null); // { pieceIndex, cells, colorIndex, w, h, cellSize }
  const [dragVisual, setDragVisual] = useState(null); // {x,y,cells,colorIndex,cellSize,w,h}
  const toastTimeout = useRef(null);

  /* ----------------------------- GAME OVER CHECK ---------------------------- */
  const checkGameOver = useCallback((nextBoard, nextTray) => {
    const stillHasPiece = nextTray.some((p) => p !== null);
    if (!stillHasPiece) return false;
    const anyFits = nextTray.some(
      (p) => p !== null && canFitAnywhere(nextBoard, p.cells)
    );
    return !anyFits;
  }, []);

  /* --------------------------------- RESTART -------------------------------- */
  const startNewGame = useCallback(() => {
    setBoard(emptyBoard());
    setTray(generateTray(theme.colors.length));
    setScore((s) => {
      setBest((b) => Math.max(b, s));
      return 0;
    });
    setGameOver(false);
    setFlashCells([]);
    setGhost(null);
  }, [theme.colors.length]);

  /* ------------------------------- PLACE PIECE ------------------------------ */
  const commitPlacement = useCallback(
    (pieceIndex, cells, colorIndex, anchorRow, anchorCol) => {
      setBoard((prevBoard) => {
        const newBoard = prevBoard.map((row) => row.slice());
        cells.forEach(([r, c]) => {
          newBoard[anchorRow + r][anchorCol + c] = colorIndex;
        });

        const placedCount = cells.length;
        const { rows, cols } = findFullLines(newBoard);
        const linesCleared = rows.length + cols.length;

        let gained = placedCount;
        if (linesCleared > 0) {
          gained += linesCleared * 10 + Math.max(0, linesCleared - 1) * 15;
          const cellsToFlash = new Set();
          rows.forEach((r) =>
            newBoard[r].forEach((_, c) => cellsToFlash.add(`${r}-${c}`))
          );
          cols.forEach((c) =>
            newBoard.forEach((_, r) => cellsToFlash.add(`${r}-${c}`))
          );
          setFlashCells(Array.from(cellsToFlash));

          setToast(
            linesCleared >= 2
              ? `Combo! +${gained}`
              : `Line clear! +${gained}`
          );
          clearTimeout(toastTimeout.current);
          toastTimeout.current = setTimeout(() => setToast(null), 1100);

          setTimeout(() => {
            setBoard((bPrev) => {
              const cleared = bPrev.map((row) => row.slice());
              rows.forEach((r) => cleared[r].fill(null));
              cols.forEach((c) => cleared.forEach((row) => (row[c] = null)));
              return cleared;
            });
            setFlashCells([]);
          }, 230);
        }

        setScore((s) => s + gained);
        return newBoard;
      });

      setTray((prevTray) => {
        const updated = prevTray.slice();
        updated[pieceIndex] = null;
        const refill = updated.every((p) => p === null);
        const finalTray = refill ? generateTray(theme.colors.length) : updated;

        setBoard((currentBoard) => {
          if (checkGameOver(currentBoard, finalTray)) {
            setTimeout(() => setGameOver(true), 260);
          }
          return currentBoard;
        });

        return finalTray;
      });
    },
    [checkGameOver, theme.colors.length]
  );

  /* -------------------------------- DRAG LOGIC ------------------------------- */

  const handlePointerDown = (e, pieceIndex) => {
    if (gameOver) return;
    const piece = tray[pieceIndex];
    if (!piece) return;
    e.preventDefault();

    const boardRect = boardRef.current.getBoundingClientRect();
    const cellSize = boardRect.width / BOARD_SIZE;
    const { w, h } = pieceDims(piece.cells);

    dragRef.current = {
      pieceIndex,
      cells: piece.cells,
      colorIndex: piece.colorIndex,
      w,
      h,
      cellSize,
      boardRect,
    };

    setDragVisual({
      x: e.clientX,
      y: e.clientY,
      cells: piece.cells,
      colorIndex: piece.colorIndex,
      cellSize,
      w,
      h,
    });

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handlePointerMove = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag) return;

    setDragVisual((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev));

    const { boardRect, cellSize, w, h, cells } = drag;
    const relX = e.clientX - boardRect.left;
    const relY = e.clientY - boardRect.top;

    const anchorCol = Math.round(relX / cellSize - w / 2);
    const anchorRow = Math.round(relY / cellSize - h / 2);

    const clampedRow = Math.max(0, Math.min(BOARD_SIZE - h, anchorRow));
    const clampedCol = Math.max(0, Math.min(BOARD_SIZE - w, anchorCol));

    const withinBoard =
      relX >= -cellSize * 0.6 &&
      relX <= boardRect.width + cellSize * 0.6 &&
      relY >= -cellSize * 1.4 &&
      relY <= boardRect.height + cellSize * 0.6;

    setBoard((currentBoard) => {
      if (!withinBoard) {
        setGhost(null);
        return currentBoard;
      }
      const valid = canPlace(currentBoard, cells, clampedRow, clampedCol);
      setGhost({
        cells,
        anchorRow: clampedRow,
        anchorCol: clampedCol,
        valid,
        colorIndex: drag.colorIndex,
      });
      return currentBoard;
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);

    const drag = dragRef.current;
    setGhost((currentGhost) => {
      if (drag && currentGhost && currentGhost.valid) {
        commitPlacement(
          drag.pieceIndex,
          currentGhost.cells,
          currentGhost.colorIndex,
          currentGhost.anchorRow,
          currentGhost.anchorCol
        );
      }
      return null;
    });

    dragRef.current = null;
    setDragVisual(null);
  }, [commitPlacement, handlePointerMove]);

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      clearTimeout(toastTimeout.current);
    };
  }, [handlePointerMove, handlePointerUp]);

  /* --------------------------------- RENDER --------------------------------- */

  const flashSet = new Set(flashCells);

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: theme.bg,
        display: "flex",
        justifyContent: "center",
        padding: "28px 14px",
        fontFamily: theme.bodyFont,
        transition: "background 0.4s ease",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        ${theme.googleFont}
        * { box-sizing: border-box; }
        @keyframes flashOut {
          0% { transform: scale(1); opacity: 1; filter: brightness(1); }
          40% { transform: scale(1.12); opacity: 1; filter: brightness(1.8); }
          100% { transform: scale(0.3); opacity: 0; filter: brightness(2.2); }
        }
        @keyframes popIn {
          0% { transform: scale(0.55); opacity: 0.4; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes toastPop {
          0% { transform: translateY(8px) scale(0.85); opacity: 0; }
          25% { transform: translateY(0) scale(1.05); opacity: 1; }
          80% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-6px) scale(1); opacity: 0; }
        }
        .bb-piece-cell { animation: popIn 0.18s ease-out; }
        .bb-flash { animation: flashOut 0.26s ease-in forwards; }
        .bb-toast { animation: toastPop 1.1s ease forwards; }
        .bb-tray-piece:hover { transform: translateY(-2px); }
        .bb-theme-btn { transition: all 0.18s ease; }
        .bb-theme-btn:active { transform: scale(0.94); }
      `}</style>

      <div style={{ width: "100%", maxWidth: 460 }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontFamily: theme.displayFont,
                fontSize: 26,
                letterSpacing: themeKey === "classic" ? 0.5 : 0,
                color: theme.textPrimary,
                fontWeight: themeKey === "material3" ? 800 : 400,
              }}
            >
              Block Blast
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: theme.textMuted }}>
              {theme.label} theme
            </p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {Object.keys(THEMES).map((key) => {
              const active = key === themeKey;
              return (
                <button
                  key={key}
                  className="bb-theme-btn"
                  onClick={() => setThemeKey(key)}
                  style={{
                    border: "none",
                    cursor: "pointer",
                    borderRadius: theme.radius,
                    padding: "8px 10px",
                    background: active ? theme.accent : theme.panel,
                    color: active
                      ? themeKey === "material3"
                        ? "#fff"
                        : "#0a0c1f"
                      : theme.textMuted,
                    boxShadow: active
                      ? `0 4px 10px ${theme.accent}55`
                      : `0 1px 0 ${theme.panelBorder}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                  title={THEMES[key].label}
                >
                  <Palette size={14} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Score panel */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              flex: 1,
              background: theme.panel,
              border: `1px solid ${theme.panelBorder}`,
              borderRadius: theme.radius + 4,
              padding: "12px 16px",
              boxShadow: themeKey === "material3" ? "0 2px 8px rgba(103,80,164,0.12)" : "none",
            }}
          >
            <div style={{ fontSize: 11, color: theme.textMuted, fontWeight: 600 }}>
              SCORE
            </div>
            <div
              style={{
                fontFamily: theme.displayFont,
                fontSize: 28,
                color: theme.textPrimary,
                lineHeight: 1.1,
              }}
            >
              {score}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              background: theme.panel,
              border: `1px solid ${theme.panelBorder}`,
              borderRadius: theme.radius + 4,
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              boxShadow: themeKey === "material3" ? "0 2px 8px rgba(103,80,164,0.12)" : "none",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: theme.textMuted,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Trophy size={12} /> BEST
            </div>
            <div
              style={{
                fontFamily: theme.displayFont,
                fontSize: 28,
                color: theme.textPrimary,
                lineHeight: 1.1,
              }}
            >
              {Math.max(best, score)}
            </div>
          </div>
        </div>

        {/* Board */}
        <div
          style={{
            position: "relative",
            background: theme.boardBg,
            borderRadius: theme.radius + 6,
            padding: 8,
            border: `1px solid ${theme.panelBorder}`,
            opacity: gameOver ? 0.55 : 1,
            transition: "opacity 0.3s ease",
          }}
        >
          <div
            ref={boardRef}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
              gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
              gap: 4,
              aspectRatio: "1 / 1",
              userSelect: "none",
              touchAction: "none",
            }}
          >
            {board.map((row, r) =>
              row.map((cell, c) => {
                const key = `${r}-${c}`;
                const isFlashing = flashSet.has(key);
                const ghostHere =
                  ghost &&
                  ghost.cells.some(
                    ([gr, gc]) =>
                      ghost.anchorRow + gr === r && ghost.anchorCol + gc === c
                  );

                let bg = theme.cellEmpty;
                let boxShadow = "none";
                let extraClass = "";

                if (cell !== null) {
                  bg = theme.colors[cell];
                  boxShadow = theme.blockShadow;
                  extraClass = "bb-piece-cell";
                }
                if (isFlashing) extraClass = "bb-flash";
                if (ghostHere && !cell) {
                  bg = ghost.valid
                    ? `${theme.colors[ghost.colorIndex]}55`
                    : "rgba(255,80,80,0.35)";
                }

                return (
                  <div
                    key={key}
                    className={extraClass}
                    style={{
                      background: bg,
                      borderRadius: theme.radius,
                      border:
                        cell === null && !ghostHere
                          ? `1px solid ${theme.cellBorder}`
                          : "none",
                      boxShadow,
                    }}
                  />
                );
              })
            )}
          </div>

          {toast && (
            <div
              className="bb-toast"
              style={{
                position: "absolute",
                top: -14,
                left: "50%",
                transform: "translateX(-50%)",
                background: theme.accent,
                color: themeKey === "material3" ? "#fff" : "#0a0c1f",
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 800,
                whiteSpace: "nowrap",
                boxShadow: `0 6px 16px ${theme.accent}66`,
              }}
            >
              {toast}
            </div>
          )}

          {gameOver && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                background:
                  themeKey === "material3"
                    ? "rgba(236,230,244,0.7)"
                    : "rgba(10,12,31,0.7)",
                borderRadius: theme.radius + 6,
              }}
            >
              <div
                style={{
                  fontFamily: theme.displayFont,
                  fontSize: 24,
                  color: theme.textPrimary,
                }}
              >
                Game over
              </div>
              <div style={{ fontSize: 13, color: theme.textMuted }}>
                Final score: {score}
              </div>
              <button
                onClick={startNewGame}
                style={{
                  border: "none",
                  cursor: "pointer",
                  background: theme.accent,
                  color: themeKey === "material3" ? "#fff" : "#0a0c1f",
                  padding: "10px 20px",
                  borderRadius: theme.radius + 4,
                  fontWeight: 800,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: `0 6px 16px ${theme.accent}66`,
                }}
              >
                <RefreshCw size={14} /> Play again
              </button>
            </div>
          )}
        </div>

        {/* Tray */}
        <div
          style={{
            marginTop: 18,
            background: theme.pieceTrayBg,
            border: `1px solid ${theme.panelBorder}`,
            borderRadius: theme.radius + 6,
            padding: "16px 10px",
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            minHeight: 96,
          }}
        >
          {tray.map((piece, idx) => {
            if (!piece) return <div key={idx} style={{ width: 80 }} />;
            const { w, h } = pieceDims(piece.cells);
            const cell = 17;
            const isDraggingThis =
              dragRef.current && dragRef.current.pieceIndex === idx;
            return (
              <div
                key={piece.id}
                className="bb-tray-piece"
                onPointerDown={(e) => handlePointerDown(e, idx)}
                style={{
                  position: "relative",
                  width: w * cell + (w - 1) * 3,
                  height: h * cell + (h - 1) * 3,
                  cursor: gameOver ? "default" : "grab",
                  opacity: isDraggingThis ? 0.25 : 1,
                  touchAction: "none",
                  transition: "transform 0.15s ease",
                }}
              >
                {piece.cells.map(([r, c], i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: c * (cell + 3),
                      top: r * (cell + 3),
                      width: cell,
                      height: cell,
                      background: theme.colors[piece.colorIndex],
                      borderRadius: theme.pieceRadius * 0.45,
                      boxShadow: theme.blockShadow,
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            onClick={startNewGame}
            style={{
              border: "none",
              cursor: "pointer",
              background: "transparent",
              color: theme.textMuted,
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
            }}
          >
            <Sparkles size={13} /> New game
          </button>
        </div>
      </div>

      {/* Floating dragged piece */}
      {dragVisual && (
        <div
          style={{
            position: "fixed",
            left: dragVisual.x,
            top: dragVisual.y,
            transform: "translate(-50%, calc(-100% - 36px))",
            pointerEvents: "none",
            zIndex: 999,
          }}
        >
          <div
            style={{
              position: "relative",
              width: dragVisual.w * dragVisual.cellSize,
              height: dragVisual.h * dragVisual.cellSize,
            }}
          >
            {dragVisual.cells.map(([r, c], i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: c * dragVisual.cellSize + 2,
                  top: r * dragVisual.cellSize + 2,
                  width: dragVisual.cellSize - 4,
                  height: dragVisual.cellSize - 4,
                  background: theme.colors[dragVisual.colorIndex],
                  borderRadius: theme.radius,
                  boxShadow: `0 8px 16px rgba(0,0,0,0.35), ${theme.blockShadow}`,
                  opacity: 0.95,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
