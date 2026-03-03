import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors } from '../../theme/colors';
import { MECHANIC } from '../../data/tasks';
import { submitTaskCompletion } from '../../utils/api';

import TaskHeader from './components/TaskHeader';
import TaskResultOverlay from './components/TaskResultOverlay';

import ScriptureMemoryTask from './mechanics/ScriptureMemoryTask';
import SlingTask from './mechanics/SlingTask';
import CollectTask from './mechanics/CollectTask';
import DragPlaceTask from './mechanics/DragPlaceTask';
import GuardTask from './mechanics/GuardTask';
import RapidTapTask from './mechanics/RapidTapTask';
import QuizTask from './mechanics/QuizTask';
import MatchPairTask from './mechanics/MatchPairTask';
import HoldTask from './mechanics/HoldTask';
import TraceTask from './mechanics/TraceTask';
import PatienceTask from './mechanics/PatienceTask';
import BuildTask from './mechanics/BuildTask';

const RESULT_DISPLAY_MS = 1500;

// In sticky-immersive mode the system reports 0 insets, so SafeAreaView
// can't help. Use a fixed bottom margin to keep content above the
// Android gesture bar / rounded-corner zone.
const BOTTOM_INSET = Platform.OS === 'android' ? 32 : 0;

export default function TaskScreen({ task, role, isAlive, token, lobbyId, onComplete, onCancel, onCustomSubmit }) {
  const [result, setResult] = useState(null); // null | { success, pointsEarned }
  const handledRef = useRef(false);

  const handleSuccess = async () => {
    if (handledRef.current) return;
    handledRef.current = true;

    let pointsEarned = 0;

    if (onCustomSubmit) {
      // Fix task — no points, custom submission
      try {
        await onCustomSubmit(task.id);
      } catch (_) {
        // Continue even if the API call fails
      }
    } else {
      pointsEarned = isAlive ? task.points.alive : task.points.dead;
      // Submit to server if we have a token and lobbyId
      if (token && lobbyId) {
        try {
          const { ok, data } = await submitTaskCompletion(token, lobbyId, task.id);
          if (ok) {
            pointsEarned = data.pointsEarned;
          }
        } catch (_) {
          // Continue offline with local points
        }
      }
    }

    setResult({ success: true, pointsEarned });
    setTimeout(() => onComplete(task.id, pointsEarned), RESULT_DISPLAY_MS);
  };

  const handleFail = () => {
    if (handledRef.current) return;
    handledRef.current = true;
    setResult({ success: false, pointsEarned: 0 });
    setTimeout(() => onCancel(), RESULT_DISPLAY_MS);
  };

  const handleTimeUp = () => {
    if (handledRef.current) return;
    handleFail();
  };

  const renderMechanic = () => {
    const props = {
      config: task.config,
      onSuccess: handleSuccess,
      onFail: handleFail,
      timeLimit: task.timeLimit,
      taskId: task.id,
    };

    switch (task.mechanic) {
      case MECHANIC.SCRIPTURE_MEMORY:
        return <ScriptureMemoryTask {...props} />;
      case MECHANIC.SLING:
        return <SlingTask {...props} />;
      case MECHANIC.COLLECT:
        return <CollectTask {...props} />;
      case MECHANIC.DRAG_PLACE:
        return <DragPlaceTask {...props} />;
      case MECHANIC.GUARD:
        return <GuardTask {...props} />;
      case MECHANIC.RAPID_TAP:
        return <RapidTapTask {...props} />;
      case MECHANIC.QUIZ:
        return <QuizTask {...props} />;
      case MECHANIC.MATCH_PAIR:
        return <MatchPairTask {...props} />;
      case MECHANIC.HOLD:
        return <HoldTask {...props} />;
      case MECHANIC.TRACE:
        return <TraceTask {...props} />;
      case MECHANIC.PATIENCE:
        return <PatienceTask {...props} />;
      case MECHANIC.BUILD:
        return <BuildTask {...props} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <TaskHeader
        title={task.title}
        reference={task.reference}
        synopsis={task.synopsis}
        timeLimit={task.timeLimit}
        onCancel={onCancel}
        onTimeUp={handleTimeUp}
      />
      <View style={styles.body}>
        {renderMechanic()}
      </View>

      {result && (
        <TaskResultOverlay
          success={result.success}
          pointsEarned={result.pointsEarned}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.space,
  },
  body: {
    flex: 1,
    marginBottom: BOTTOM_INSET,
  },
});
