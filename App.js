import { StatusBar } from "expo-status-bar";
import { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, PanResponder, Animated } from "react-native";
import { Accelerometer } from "expo-sensors";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 50;
const BULLET_WIDTH = 10;
const BULLET_HEIGHT = 20;
const BLOCK_WIDTH = 40;
const BLOCK_HEIGHT = 40;
const HUD_HEIGHT = 130;

export default function App() {
  const [playerX, setPlayerX] = useState((screenWidth - PLAYER_WIDTH) / 2);
  const [bullets, setBullets] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [welcomeOpacity] = useState(new Animated.Value(1));

  const gameStateRef = useRef({ playerX, bullets, blocks, gameOver, score });
  const lastXRef = useRef(playerX);
  
  const panResponderRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lastXRef.current = playerX;
      },
      onPanResponderMove: (evt, gestureState) => {
        const moveX = gestureState.dx;
        
        // Direct movement - 1:1 ratio with finger movement
        let newX = lastXRef.current + moveX;
        newX = Math.max(0, Math.min(newX, screenWidth - PLAYER_WIDTH));
        setPlayerX(newX);
      },
    })
  );

  useEffect(() => {
    gameStateRef.current = { playerX, bullets, blocks, gameOver, score };
  }, [playerX, bullets, blocks, gameOver, score]);

  // Tap to fire on screen
  const handleScreenTap = () => {
    if (gameStarted && !gameOver) {
      setBullets((prev) => [
        ...prev,
        {
          id: Math.random(),
          x: playerX + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
          y: screenHeight - PLAYER_HEIGHT - 25,
        },
      ]);
    }
  };

  // Button controls for left/right
  const handleLeftPress = () => {
    if (gameStarted && !gameOver) {
      setPlayerX((prev) => Math.max(0, prev - 20));
    }
  };

  const handleRightPress = () => {
    if (gameStarted && !gameOver) {
      setPlayerX((prev) => Math.min(screenWidth - PLAYER_WIDTH, prev + 20));
    }
  };


  // Tilt controls
  useEffect(() => {
    Accelerometer.setUpdateInterval(50);
    const subscription = Accelerometer.addListener(({ x }) => {
      setPlayerX((prev) => {
        let newX = prev + x * 20;
        return Math.max(0, Math.min(newX, screenWidth - PLAYER_WIDTH));
      });
    });
    return () => subscription.remove();
  }, []);

  // Main game loop - optimized
  useEffect(() => {
    if (gameOver || !gameStarted) return;

    const gameLoop = setInterval(() => {
      const state = gameStateRef.current;

      let newBullets = state.bullets
        .map((b) => ({ ...b, y: b.y - 12 }))
        .filter((b) => b.y > HUD_HEIGHT);

      let newBlocks = state.blocks
        .map((b) => ({ ...b, y: b.y + 6 }))
        .filter((b) => b.y < screenHeight);

      // Check block-player collision
      let gameOverFlag = false;
      for (let block of newBlocks) {
        if (
          block.y + BLOCK_HEIGHT > screenHeight - PLAYER_HEIGHT - 20 &&
          block.x < state.playerX + PLAYER_WIDTH &&
          block.x + BLOCK_WIDTH > state.playerX
        ) {
          gameOverFlag = true;
          break;
        }
      }

      if (gameOverFlag) {
        setGameOver(true);
        return;
      }

      // Collision detection
      let hitBlocks = new Set();
      let hitBullets = new Set();
      let scoreIncrease = 0;

      for (let bullet of newBullets) {
        for (let block of newBlocks) {
          if (
            bullet.y < block.y + BLOCK_HEIGHT &&
            bullet.y + BULLET_HEIGHT > block.y &&
            bullet.x < block.x + BLOCK_WIDTH &&
            bullet.x + BULLET_WIDTH > block.x
          ) {
            hitBlocks.add(block.id);
            hitBullets.add(bullet.id);
            scoreIncrease += 10;
          }
        }
      }

      if (hitBlocks.size > 0 || hitBullets.size > 0) {
        newBullets = newBullets.filter((b) => !hitBullets.has(b.id));
        newBlocks = newBlocks.filter((b) => !hitBlocks.has(b.id));
        if (scoreIncrease > 0) {
          setScore((s) => s + scoreIncrease);
        }
      }

      // Always update bullets and blocks
      setBullets(newBullets);
      setBlocks(newBlocks);
    }, 16);

    return () => clearInterval(gameLoop);
  }, [gameOver, gameStarted]);

  // Spawn falling blocks
  useEffect(() => {
    if (gameOver || !gameStarted) return;
    const spawnInterval = setInterval(() => {
      setBlocks((prev) => [
        ...prev,
        {
          id: Math.random(),
          x: Math.random() * (screenWidth - BLOCK_WIDTH),
          y: HUD_HEIGHT,
        },
      ]);
    }, 700);
    return () => clearInterval(spawnInterval);
  }, [gameOver, gameStarted]);

  // Auto-shoot bullets - increased rate
  useEffect(() => {
    if (gameOver || !gameStarted) return;
    const shootInterval = setInterval(() => {
      setBullets((prev) => [
        ...prev,
        {
          id: Math.random(),
          x: playerX + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
          y: screenHeight - PLAYER_HEIGHT - 25,
        },
      ]);
    }, 50);
    return () => clearInterval(shootInterval);
  }, [playerX, gameOver, gameStarted]);

  // Welcome screen animation
  useEffect(() => {
    if (gameStarted) {
      Animated.timing(welcomeOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [gameStarted, welcomeOpacity]);

  return (
    <TouchableOpacity 
      style={styles.container} 
      {...panResponderRef.current?.panHandlers}
      onPress={handleScreenTap}
      activeOpacity={1}
    >
      {/* Background grid effect */}
      <View style={styles.gridBackground} />

      {!gameStarted && (
        <Animated.View style={[styles.welcomeContainer, { opacity: welcomeOpacity }]}>
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeTitle}>TILT FIRE</Text>
            <Text style={styles.welcomeSubtitle}>Arrow Keys to Move</Text>
            <Text style={styles.welcomeSubtitle}>Spacebar to Fire</Text>
            <Text style={styles.welcomeSubtitle}>Tap Screen to Move</Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => setGameStarted(true)}
            >
              <Text style={styles.startButtonText}>START GAME</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {gameStarted && (
        <>
          {/* Top HUD - rendered first with high z-index */}
          <View style={styles.hudTop}>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>SCORE</Text>
              <Text style={styles.scoreValue}>{score}</Text>
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.gameTitle}>TILT FIRE</Text>
            </View>
          </View>

          {/* Falling blocks */}
          {blocks.map((block) => (
            <View
              key={block.id}
              style={[
                styles.fallingBlock,
                { left: block.x, top: block.y },
              ]}
            >
              <View style={styles.blockGlow} />
            </View>
          ))}

          {/* Bullets */}
          {bullets.map((bullet) => (
            <View
              key={bullet.id}
              style={[
                styles.bullet,
                { left: bullet.x, top: bullet.y },
              ]}
            >
              <View style={styles.bulletGlow} />
            </View>
          ))}

          {/* Player */}
          <View style={[styles.player, { left: playerX }]}>
            <View style={styles.playerGlow} />
            <Text style={styles.playerIcon}>▲</Text>
          </View>

          {/* Control Buttons */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={handleLeftPress}
            >
              <Text style={styles.controlButtonText}>◀ LEFT</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={handleRightPress}
            >
              <Text style={styles.controlButtonText}>RIGHT ▶</Text>
            </TouchableOpacity>
          </View>

          {/* Game Over */}
          {gameOver && (
            <View style={styles.gameOverContainer}>
              <View style={styles.gameOverCard}>
                <Text style={styles.gameOverText}>GAME OVER</Text>
                <View style={styles.scoreDisplay}>
                  <Text style={styles.scoreLabel}>FINAL SCORE</Text>
                  <Text style={styles.finalScore}>{score}</Text>
                </View>
                <TouchableOpacity
                  style={styles.restartButton}
                  onPress={() => {
                    setGameOver(false);
                    setGameStarted(false);
                    setScore(0);
                    setBullets([]);
                    setBlocks([]);
                    setPlayerX((screenWidth - PLAYER_WIDTH) / 2);
                  }}
                >
                  <Text style={styles.restartButtonText}>RESTART GAME</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}

      <StatusBar style="light" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0e27",
    overflow: "hidden",
  },
  welcomeContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0a0e27",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
  welcomeContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeTitle: {
    color: "#00FFFF",
    fontSize: 56,
    fontWeight: "bold",
    letterSpacing: 4,
    fontFamily: "Courier",
    textShadowColor: "#00FFFF",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginBottom: 40,
  },
  welcomeSubtitle: {
    color: "#00FF00",
    fontSize: 16,
    fontFamily: "Courier",
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: "center",
  },
  startButton: {
    backgroundColor: "#00FF00",
    paddingHorizontal: 50,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#00FFFF",
    marginTop: 40,
  },
  startButtonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 2,
    fontFamily: "Courier",
  },
  controlsContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    zIndex: 500,
  },
  controlButton: {
    backgroundColor: "#00FFFF",
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#00FF00",
    minWidth: 120,
    alignItems: "center",
  },
  controlButtonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 2,
    fontFamily: "Courier",
  },
  gridBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0a0e27",
  },
  hudTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 130,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: "rgba(10, 14, 39, 0.98)",
    borderBottomWidth: 2,
    borderBottomColor: "#00FFFF",
    zIndex: 1000,
  },
  scoreContainer: {
    alignItems: "flex-start",
    marginTop: 8,
  },
  scoreLabel: {
    color: "#00FFFF",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 2,
    fontFamily: "Courier",
  },
  scoreValue: {
    color: "#00FF00",
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: "Courier",
    marginTop: 2,
  },
  titleContainer: {
    alignItems: "center",
    flex: 1,
  },
  gameTitle: {
    color: "#00FFFF",
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 3,
    fontFamily: "Courier",
    textShadowColor: "#00FFFF",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  player: {
    position: "absolute",
    bottom: 20,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    backgroundColor: "#00FF00",
    borderWidth: 2,
    borderColor: "#00FFFF",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
  },
  playerGlow: {
    position: "absolute",
    width: PLAYER_WIDTH + 10,
    height: PLAYER_HEIGHT + 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 255, 0.5)",
    top: -5,
    left: -5,
  },
  playerIcon: {
    color: "#000",
    fontSize: 24,
    fontWeight: "bold",
  },
  bullet: {
    position: "absolute",
    width: BULLET_WIDTH,
    height: BULLET_HEIGHT,
    backgroundColor: "#FFFF00",
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  bulletGlow: {
    position: "absolute",
    width: BULLET_WIDTH + 6,
    height: BULLET_HEIGHT + 6,
    borderRadius: 5,
    backgroundColor: "rgba(255, 255, 0, 0.4)",
    top: -3,
    left: -3,
  },
  fallingBlock: {
    position: "absolute",
    width: BLOCK_WIDTH,
    height: BLOCK_HEIGHT,
    backgroundColor: "#FF1744",
    borderWidth: 2,
    borderColor: "#FF6E40",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  blockGlow: {
    position: "absolute",
    width: BLOCK_WIDTH + 8,
    height: BLOCK_HEIGHT + 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 23, 68, 0.6)",
    top: -4,
    left: -4,
  },
  gameOverContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  gameOverCard: {
    backgroundColor: "#0a0e27",
    borderWidth: 2,
    borderColor: "#00FFFF",
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
    shadowColor: "#00FFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  gameOverText: {
    color: "#FF1744",
    fontSize: 48,
    fontWeight: "bold",
    fontFamily: "Courier",
    marginBottom: 30,
    letterSpacing: 2,
    textShadowColor: "#FF1744",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  scoreDisplay: {
    alignItems: "center",
    marginBottom: 30,
  },
  finalScore: {
    color: "#00FF00",
    fontSize: 48,
    fontWeight: "bold",
    fontFamily: "Courier",
    marginTop: 8,
  },
  restartButton: {
    backgroundColor: "#00FF00",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#00FFFF",
  },
  restartButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
    fontFamily: "Courier",
  },
});
