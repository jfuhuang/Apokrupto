import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const DOT_COUNT = 30;
const MAX_CONNECTION_DISTANCE = 150;
const IMPOSTOR_COUNT = 3;
const KILL_INTERVAL = 3000; // Kill every 3 seconds
const RESPAWN_DELAY = 2000; // Respawn after 2 seconds

class Dot {
  constructor(isImpostor = false) {
    this.x = Math.random() * SCREEN_WIDTH;
    this.y = Math.random() * SCREEN_HEIGHT;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.isImpostor = isImpostor;
    this.isAlive = true;
    this.respawnTime = null;
  }

  update() {
    if (!this.isAlive) {
      if (this.respawnTime && Date.now() >= this.respawnTime) {
        this.isAlive = true;
        this.respawnTime = null;
      }
      return;
    }

    this.x += this.vx;
    this.y += this.vy;

    // Bounce off walls
    if (this.x <= 0 || this.x >= SCREEN_WIDTH) this.vx *= -1;
    if (this.y <= 0 || this.y >= SCREEN_HEIGHT) this.vy *= -1;

    // Keep within bounds
    this.x = Math.max(0, Math.min(SCREEN_WIDTH, this.x));
    this.y = Math.max(0, Math.min(SCREEN_HEIGHT, this.y));
  }

  distanceTo(other) {
    return Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2));
  }
}

export default function AnimatedBackground() {
  const dotsRef = useRef([]);
  const frameRef = useRef(null);
  const lastKillTimeRef = useRef(Date.now());
  const canvasOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initialize dots
    const dots = [];
    for (let i = 0; i < IMPOSTOR_COUNT; i++) {
      dots.push(new Dot(true));
    }
    for (let i = IMPOSTOR_COUNT; i < DOT_COUNT; i++) {
      dots.push(new Dot(false));
    }
    dotsRef.current = dots;

    // Fade in animation
    Animated.timing(canvasOpacity, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Animation loop
    const animate = () => {
      const currentTime = Date.now();
      
      // Update all dots
      dotsRef.current.forEach(dot => dot.update());

      // Impostor kill logic
      if (currentTime - lastKillTimeRef.current >= KILL_INTERVAL) {
        const impostors = dotsRef.current.filter(d => d.isImpostor && d.isAlive);
        const crewmates = dotsRef.current.filter(d => !d.isImpostor && d.isAlive);
        
        if (impostors.length > 0 && crewmates.length > 0) {
          const impostor = impostors[Math.floor(Math.random() * impostors.length)];
          
          // Find connected crewmates
          const connectedCrewmates = crewmates.filter(
            crewmate => impostor.distanceTo(crewmate) <= MAX_CONNECTION_DISTANCE
          );
          
          if (connectedCrewmates.length > 0) {
            const victim = connectedCrewmates[Math.floor(Math.random() * connectedCrewmates.length)];
            victim.isAlive = false;
            victim.respawnTime = currentTime + RESPAWN_DELAY;
          }
        }
        
        lastKillTimeRef.current = currentTime;
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: canvasOpacity }]}>
      <View style={styles.canvas}>
        {dotsRef.current.map((dot, i) => (
          <React.Fragment key={i}>
            {/* Draw connections */}
            {dotsRef.current.slice(i + 1).map((otherDot, j) => {
              if (!dot.isAlive || !otherDot.isAlive) return null;
              
              const distance = dot.distanceTo(otherDot);
              if (distance <= MAX_CONNECTION_DISTANCE) {
                const opacity = 1 - (distance / MAX_CONNECTION_DISTANCE);
                const angle = Math.atan2(otherDot.y - dot.y, otherDot.x - dot.x);
                
                return (
                  <View
                    key={`${i}-${j}`}
                    style={[
                      styles.line,
                      {
                        left: dot.x,
                        top: dot.y,
                        width: distance,
                        transform: [{ rotate: `${angle}rad` }],
                        opacity: opacity * 0.3,
                      },
                    ]}
                  />
                );
              }
              return null;
            })}
          </React.Fragment>
        ))}
        
        {/* Draw dots */}
        {dotsRef.current.map((dot, i) => (
          dot.isAlive && (
            <View
              key={`dot-${i}`}
              style={[
                styles.dot,
                {
                  left: dot.x - 4,
                  top: dot.y - 4,
                  backgroundColor: dot.isImpostor ? '#ff0000' : '#00ff00',
                },
              ]}
            />
          )
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  canvas: {
    flex: 1,
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  line: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#ffffff',
    transformOrigin: '0 0',
  },
});
