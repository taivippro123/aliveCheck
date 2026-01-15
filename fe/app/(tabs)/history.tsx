import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { checkInService } from '@/services/checkInService';
import { Colors } from '@/constants/theme';

interface HistoryItem {
  timestamp: string;
}

interface HistoryResponse {
  success: boolean;
  history: HistoryItem[];
  total: number;
}

interface GroupedHistory {
  date: string;
  items: HistoryItem[];
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function HistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groupedHistory, setGroupedHistory] = useState<GroupedHistory[]>([]);

  const loadHistory = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const res: HistoryResponse = await checkInService.getHistory();
      console.log('History response:', res);
      
      if (res.success && res.history) {
        const groups: Record<string, HistoryItem[]> = {};
        res.history.forEach((item) => {
          if (item.timestamp) {
            const dateKey = formatDate(item.timestamp);
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(item);
          }
        });

        const grouped: GroupedHistory[] = Object.keys(groups)
          .sort((a, b) => {
            // Sort dates descending (newest first)
            return new Date(b).getTime() - new Date(a).getTime();
          })
          .map((date) => ({
            date,
            items: groups[date].sort((a, b) => {
              // Sort items within each date descending (newest first)
              return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            }),
          }));

        setGroupedHistory(grouped);
        console.log('Grouped history:', grouped);
      }
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Refresh khi vào lại tab
  useFocusEffect(
    React.useCallback(() => {
      loadHistory();
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        contentContainerStyle={
          groupedHistory.length === 0 ? styles.emptyListContent : styles.listContent
        }
        data={groupedHistory}
        keyExtractor={(item) => item.date}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadHistory(true)}
            tintColor={Colors.light.tint}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{item.date}</Text>
            {item.items.map((entry, index) => (
              <View key={`${entry.timestamp}-${index}`} style={styles.row}>
                <Text style={styles.timeText}>{formatTime(entry.timestamp)}</Text>
                <Text style={styles.statusText}>Đã điểm danh</Text>
              </View>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Chưa có lịch sử điểm danh</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  statusText: {
    fontSize: 14,
    color: Colors.light.tint,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.icon,
    textAlign: 'center',
  },
});

