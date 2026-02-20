import React, { useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

const RESULT_DISPLAY_MS = 1500;

export default function TaskScreen({ task, role, isAlive, token, lobbyId, onComplete, onCancel }) {
  const [result, setResult] = useState(null); // null | { success, pointsEarned }
  const handledRef = useRef(false);

  const handleSuccess = async () => {
    if (handledRef.current) return;
    handledRef.current = true;

    let pointsEarned = isAlive ? task.points.alive : task.points.dead;

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
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <TaskHeader
          title={task.title}
          reference={task.reference}
          timeLimit={task.timeLimit}
          onCancel={onCancel}
          onTimeUp={handleTimeUp}
        />
        <View style={styles.body}>
          {renderMechanic()}
        </View>
      </SafeAreaView>

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
  safeArea: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
});
