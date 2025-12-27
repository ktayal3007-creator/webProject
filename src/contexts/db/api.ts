import { supabase } from './supabase';
import type { LostItem, FoundItem, ReturnedItem, LostItemInput, FoundItemInput, ChatConversation, ChatMessage, LostItemWithProfile, FoundItemWithProfile } from '@/types/types';

// Lost Items API
export const getLostItems = async (
  searchTerm?: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<LostItemWithProfile[]> => {
  let query = supabase
    .from('lost_items_with_profile')
    .select('*')
    .eq('history_type', 'ACTIVE')
    .order('created_at', { ascending: false });

  if (searchTerm && searchTerm.trim() !== '') {
    query = query.or(`item_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%,campus.ilike.%${searchTerm}%`);
  }

  if (dateFrom) {
    query = query.gte('date_lost', dateFrom.toISOString());
  }

  if (dateTo) {
    const endOfDay = new Date(dateTo);
    endOfDay.setHours(23, 59, 59, 999);
    query = query.lte('date_lost', endOfDay.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching lost items:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
};

export const getLostItemById = async (id: string): Promise<LostItemWithProfile | null> => {
  const { data, error } = await supabase
    .from('lost_items_with_profile')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching lost item:', error);
    throw error;
  }

  return data;
};

export const createLostItem = async (item: LostItemInput): Promise<LostItem> => {
  const { data, error } = await supabase
    .from('lost_items')
    .insert([item])
    .select()
    .single();

  if (error) {
    console.error('Error creating lost item:', error);
    throw error;
  }

  return data;
};

// Found Items API
export const getFoundItems = async (
  searchTerm?: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<FoundItemWithProfile[]> => {
  let query = supabase
    .from('found_items_with_profile')
    .select('*')
    .eq('history_type', 'ACTIVE')
    .order('created_at', { ascending: false });

  if (searchTerm && searchTerm.trim() !== '') {
    query = query.or(`item_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%,campus.ilike.%${searchTerm}%`);
  }

  if (dateFrom) {
    query = query.gte('date_found', dateFrom.toISOString());
  }

  if (dateTo) {
    const endOfDay = new Date(dateTo);
    endOfDay.setHours(23, 59, 59, 999);
    query = query.lte('date_found', endOfDay.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching found items:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
};

export const getFoundItemById = async (id: string): Promise<FoundItemWithProfile | null> => {
  const { data, error } = await supabase
    .from('found_items_with_profile')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching found item:', error);
    throw error;
  }

  return data;
};

export const createFoundItem = async (item: FoundItemInput): Promise<FoundItem> => {
  const { data, error } = await supabase
    .from('found_items')
    .insert([item])
    .select()
    .single();

  if (error) {
    console.error('Error creating found item:', error);
    throw error;
  }

  return data;
};

// Returned Items API
// Get returned items with date filtering (MAIN_HISTORY items)
export const getReturnedItems = async (
  dateFrom?: Date,
  dateTo?: Date
): Promise<Array<LostItemWithProfile | FoundItemWithProfile>> => {
  // Build query for lost items
  let lostQuery = supabase
    .from('lost_items_with_profile')
    .select('*')
    .eq('history_type', 'MAIN_HISTORY')
    .order('concluded_at', { ascending: false });

  if (dateFrom) {
    lostQuery = lostQuery.gte('concluded_at', dateFrom.toISOString());
  }

  if (dateTo) {
    const endOfDay = new Date(dateTo);
    endOfDay.setHours(23, 59, 59, 999);
    lostQuery = lostQuery.lte('concluded_at', endOfDay.toISOString());
  }

  // Build query for found items
  let foundQuery = supabase
    .from('found_items_with_profile')
    .select('*')
    .eq('history_type', 'MAIN_HISTORY')
    .order('concluded_at', { ascending: false });

  if (dateFrom) {
    foundQuery = foundQuery.gte('concluded_at', dateFrom.toISOString());
  }

  if (dateTo) {
    const endOfDay = new Date(dateTo);
    endOfDay.setHours(23, 59, 59, 999);
    foundQuery = foundQuery.lte('concluded_at', endOfDay.toISOString());
  }

  const [{ data: lostData, error: lostError }, { data: foundData, error: foundError }] = await Promise.all([
    lostQuery,
    foundQuery
  ]);

  if (lostError) {
    console.error('Error fetching returned lost items:', lostError);
  }

  if (foundError) {
    console.error('Error fetching returned found items:', foundError);
  }

  // Combine and sort by concluded_at
  const combined = [
    ...(Array.isArray(lostData) ? lostData.map(item => ({ ...item, itemType: 'lost' as const })) : []),
    ...(Array.isArray(foundData) ? foundData.map(item => ({ ...item, itemType: 'found' as const })) : [])
  ];

  combined.sort((a, b) => {
    const dateA = new Date(a.concluded_at || a.created_at);
    const dateB = new Date(b.concluded_at || b.created_at);
    return dateB.getTime() - dateA.getTime();
  });

  return combined;
};

export const getReturnedItemById = async (id: string): Promise<ReturnedItem | null> => {
  const { data, error } = await supabase
    .from('returned_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching returned item:', error);
    throw error;
  }

  return data;
};

// Get recent items for homepage
export const getRecentLostItems = async (limit = 6): Promise<LostItemWithProfile[]> => {
  const { data, error } = await supabase
    .from('lost_items_with_profile')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent lost items:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
};

export const getRecentFoundItems = async (limit = 6): Promise<FoundItemWithProfile[]> => {
  const { data, error } = await supabase
    .from('found_items_with_profile')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent found items:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
};

// Get recent returned items (MAIN_HISTORY items - public success stories)
export const getRecentReturnedItems = async (limit = 6): Promise<Array<LostItemWithProfile | FoundItemWithProfile>> => {
  // Get recent lost items that were found (MAIN_HISTORY)
  const { data: lostData, error: lostError } = await supabase
    .from('lost_items_with_profile')
    .select('*')
    .eq('history_type', 'MAIN_HISTORY')
    .order('concluded_at', { ascending: false })
    .limit(Math.ceil(limit / 2));

  if (lostError) {
    console.error('Error fetching recent returned lost items:', lostError);
  }

  // Get recent found items where owner was found (MAIN_HISTORY)
  const { data: foundData, error: foundError } = await supabase
    .from('found_items_with_profile')
    .select('*')
    .eq('history_type', 'MAIN_HISTORY')
    .order('concluded_at', { ascending: false })
    .limit(Math.ceil(limit / 2));

  if (foundError) {
    console.error('Error fetching recent returned found items:', foundError);
  }

  // Combine and sort by concluded_at
  const combined = [
    ...(Array.isArray(lostData) ? lostData.map(item => ({ ...item, itemType: 'lost' as const })) : []),
    ...(Array.isArray(foundData) ? foundData.map(item => ({ ...item, itemType: 'found' as const })) : [])
  ];

  // Sort by concluded_at (newest first) and limit
  combined.sort((a, b) => {
    const dateA = new Date(a.concluded_at || a.created_at);
    const dateB = new Date(b.concluded_at || b.created_at);
    return dateB.getTime() - dateA.getTime();
  });

  return combined.slice(0, limit);
};

// Count functions for stats
export const getLostItemsCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('lost_items')
    .select('*', { count: 'exact', head: true })
    .eq('history_type', 'ACTIVE');

  if (error) {
    console.error('Error counting lost items:', error);
    return 0;
  }

  return count || 0;
};

export const getFoundItemsCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('found_items')
    .select('*', { count: 'exact', head: true })
    .eq('history_type', 'ACTIVE');

  if (error) {
    console.error('Error counting found items:', error);
    return 0;
  }

  return count || 0;
};

export const getReturnedItemsCount = async (): Promise<number> => {
  // Count lost items with MAIN_HISTORY
  const { count: lostCount, error: lostError } = await supabase
    .from('lost_items')
    .select('*', { count: 'exact', head: true })
    .eq('history_type', 'MAIN_HISTORY');

  if (lostError) {
    console.error('Error counting returned lost items:', lostError);
  }

  // Count found items with MAIN_HISTORY
  const { count: foundCount, error: foundError } = await supabase
    .from('found_items')
    .select('*', { count: 'exact', head: true })
    .eq('history_type', 'MAIN_HISTORY');

  if (foundError) {
    console.error('Error counting returned found items:', foundError);
  }

  return (lostCount || 0) + (foundCount || 0);
};

// Chat API
export const getOrCreateConversation = async (
  lostItemId: string | null,
  foundItemId: string | null,
  lostItemOwnerId: string,
  foundItemReporterId: string
): Promise<ChatConversation | null> => {
  // Determine item_id and item_type
  const itemId = lostItemId || foundItemId;
  const itemType = lostItemId ? 'lost' : 'found';
  const participantIds = [lostItemOwnerId, foundItemReporterId];

  if (!itemId) {
    throw new Error('Either lostItemId or foundItemId must be provided');
  }

  // First try to get existing conversation
  const { data: existing } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('item_id', itemId)
    .eq('item_type', itemType)
    .contains('participant_ids', participantIds)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  // Create new conversation
  const { data, error } = await supabase
    .from('chat_conversations')
    .insert({
      item_id: itemId,
      item_type: itemType,
      participant_ids: participantIds,
      // Keep legacy fields for backward compatibility
      lost_item_id: lostItemId,
      found_item_id: foundItemId,
      lost_item_owner_id: lostItemOwnerId,
      found_item_reporter_id: foundItemReporterId,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }

  return data;
};

export const getUserConversations = async (userId: string): Promise<ChatConversation[]> => {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('*')
    .or(`lost_item_owner_id.eq.${userId},found_item_reporter_id.eq.${userId}`)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
};

// Get conversations with item and user details for chat history
export const getUserConversationsWithDetails = async (userId: string) => {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select(`
      *,
      lost_item:lost_items!lost_item_id(id, item_name, image_url, category),
      found_item:found_items!found_item_id(id, item_name, image_url, category),
      lost_owner:profiles!lost_item_owner_id(id, full_name, email),
      found_reporter:profiles!found_item_reporter_id(id, full_name, email)
    `)
    .or(`lost_item_owner_id.eq.${userId},found_item_reporter_id.eq.${userId}`)
    .is('history_deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching conversations with details:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
};

export const getConversationMessages = async (conversationId: string): Promise<ChatMessage[]> => {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
};

export const sendMessage = async (
  conversationId: string,
  senderId: string,
  message: string
): Promise<ChatMessage | null> => {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      message,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error sending message:', error);
    throw error;
  }

  // Update conversation's updated_at
  await supabase
    .from('chat_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data;
};

export const markMessagesAsRead = async (conversationId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('chat_messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('read', false);

  if (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

// Edit a message
export const editMessage = async (
  messageId: string,
  newMessage: string
): Promise<ChatMessage | null> => {
  const { data, error } = await supabase
    .from('chat_messages')
    .update({
      message: newMessage,
      edited_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error editing message:', error);
    throw error;
  }

  return data;
};

// Soft delete a message (mark as deleted but keep in database)
export const softDeleteMessage = async (messageId: string): Promise<void> => {
  const { error } = await supabase
    .from('chat_messages')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      message: '', // Clear the message content
    })
    .eq('id', messageId);

  if (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

// Hard delete a message (remove from database)
export const hardDeleteMessage = async (messageId: string): Promise<void> => {
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

// Match API
export const getUserMatches = async (userId: string) => {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      lost_item:lost_items(*),
      found_item:found_items(*)
    `)
    .or(`lost_items.user_id.eq.${userId},found_items.user_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching matches:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
};

export const getMatchById = async (matchId: string) => {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      lost_item:lost_items(*),
      found_item:found_items(*)
    `)
    .eq('id', matchId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching match:', error);
    throw error;
  }

  return data;
};

export const updateMatchStatus = async (matchId: string, status: 'confirmed' | 'rejected') => {
  const { data, error } = await supabase
    .from('matches')
    .update({ status })
    .eq('id', matchId)
    .select()
    .single();

  if (error) {
    console.error('Error updating match status:', error);
    throw error;
  }

  return data;
};

export const getUserNotifications = async (userId: string) => {
  const { data, error } = await supabase
    .from('match_notifications')
    .select(`
      *,
      match:matches(
        *,
        lost_item:lost_items(*),
        found_item:found_items(*)
      )
    `)
    .eq('user_id', userId)
    .eq('notification_type', 'in_app')
    .is('read_at', null)
    .order('sent_at', { ascending: false });

  if (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
};

export const markNotificationAsRead = async (notificationId: string) => {
  const { error } = await supabase
    .from('match_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Trigger auto-matching after item creation
export const triggerAutoMatch = async (itemType: 'lost' | 'found', itemId: string) => {
  try {
    // Fire and forget - don't wait for response, don't block UI
    // Set a reasonable timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI matching timeout')), 15000)
    );

    const matchPromise = supabase.functions.invoke('auto-match-items', {
      body: { itemType, itemId },
    });

    // Race between timeout and actual call
    const { data, error } = await Promise.race([matchPromise, timeoutPromise]) as any;

    if (error) {
      console.warn('AI matching error (non-critical):', error);
      // Don't throw - this is background operation
      return null;
    }

    console.log('AI matching triggered successfully:', data);
    return data;
  } catch (error) {
    // Log but don't throw - AI matching failure shouldn't block user
    console.warn('AI matching failed (non-critical):', error);
    return null;
  }
};

// Chat deletion (one-sided)
// Delete chat for current user (one-sided deletion using database function)
export const deleteChatForUser = async (conversationId: string, userId: string): Promise<{ success: boolean; message: string }> => {
  const { data, error } = await supabase
    .rpc('delete_chat_for_user', {
      p_conversation_id: conversationId,
      p_user_id: userId
    });

  if (error) {
    console.error('Error deleting chat:', error);
    throw new Error('Failed to delete chat: ' + error.message);
  }

  if (!data || data.length === 0) {
    throw new Error('No response from delete operation');
  }

  const result = data[0];
  
  if (!result.success) {
    throw new Error(result.message);
  }

  return result;
};

// Get conversations for user (excluding deleted ones)
export const getChatConversationsForUser = async (userId: string) => {
  const { data, error } = await supabase
    .from('chat_conversations_with_details')
    .select('*')
    .contains('participant_ids', [userId])
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }

  // Filter out conversations deleted by this user
  const filtered = (data || []).filter(conv => {
    const deletedBy = conv.deleted_by_user_ids || [];
    return !deletedBy.includes(userId);
  });

  return filtered;
};

// Conclude an item (lost or found)
export const concludeItem = async (
  itemId: string,
  itemType: 'lost' | 'found',
  conclusionType: string,
  userId: string
): Promise<{ success: boolean; message: string; historyType?: string }> => {
  const { data, error } = await supabase
    .rpc('conclude_item_with_history', {
      p_item_id: itemId,
      p_item_type: itemType,
      p_conclusion_type: conclusionType,
      p_user_id: userId
    });

  if (error) {
    console.error('Error concluding item:', error);
    throw new Error(error.message || 'Failed to conclude item');
  }

  if (!data || data.length === 0) {
    throw new Error('No response from database');
  }

  const result = data[0];
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to conclude item');
  }

  return {
    success: result.success,
    message: result.message,
    historyType: result.history_type
  };
};

// Check if user can delete chat (has made conclusion if they're the reporter)
// Check if user can delete a chat (using database function)
export const canDeleteChat = async (
  conversationId: string,
  userId: string
): Promise<{ canDelete: boolean; reason?: string }> => {
  const { data, error } = await supabase
    .rpc('can_user_delete_chat', {
      p_conversation_id: conversationId,
      p_user_id: userId
    });

  if (error) {
    console.error('Error checking delete permission:', error);
    return { canDelete: false, reason: 'Error checking permissions' };
  }

  if (!data || data.length === 0) {
    return { canDelete: false, reason: 'Unable to verify permissions' };
  }

  return {
    canDelete: data[0].can_delete,
    reason: data[0].reason
  };
};

// Get item history for user (concluded items)
// Get user's item history (USER_HISTORY items only)
// This function is kept for backward compatibility, but now uses getUserHistory
export const getItemHistory = async (userId: string) => {
  return getUserHistory(userId);
};

// Delete item from history (uses new database function for USER_HISTORY only)
export const deleteItemFromHistory = async (
  itemId: string,
  itemType: 'lost' | 'found',
  userId: string
) => {
  return deleteUserHistoryItem(itemId, itemType, userId);
};

// Legacy function - kept for backward compatibility
export const deleteChatHistory = async (conversationId: string, userId: string) => {
  // Use the new one-sided deletion instead
  await deleteChatForUser(conversationId, userId);
};

// ════════════════════════════════════════════════════════════════════════════
// PUBLIC HISTORY & CLEANUP FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

// Get all MAIN_HISTORY items (public success stories)
export const getMainHistory = async (): Promise<{
  lostItems: LostItemWithProfile[];
  foundItems: FoundItemWithProfile[];
}> => {
  // Get lost items with MAIN_HISTORY
  const { data: lostData, error: lostError } = await supabase
    .from('lost_items_with_profile')
    .select('*')
    .eq('history_type', 'MAIN_HISTORY')
    .order('concluded_at', { ascending: false });

  if (lostError) {
    console.error('Error fetching main history lost items:', lostError);
    throw lostError;
  }

  // Get found items with MAIN_HISTORY
  const { data: foundData, error: foundError } = await supabase
    .from('found_items_with_profile')
    .select('*')
    .eq('history_type', 'MAIN_HISTORY')
    .order('concluded_at', { ascending: false });

  if (foundError) {
    console.error('Error fetching main history found items:', foundError);
    throw foundError;
  }

  return {
    lostItems: (lostData || []) as LostItemWithProfile[],
    foundItems: (foundData || []) as FoundItemWithProfile[]
  };
};

// Get user's private history (USER_HISTORY items)
export const getUserHistory = async (userId: string): Promise<{
  lostItems: LostItemWithProfile[];
  foundItems: FoundItemWithProfile[];
}> => {
  // Get user's lost items with USER_HISTORY
  const { data: lostData, error: lostError } = await supabase
    .from('lost_items_with_profile')
    .select('*')
    .eq('user_id', userId)
    .eq('history_type', 'USER_HISTORY')
    .order('concluded_at', { ascending: false });

  if (lostError) {
    console.error('Error fetching user history lost items:', lostError);
    throw lostError;
  }

  // Get user's found items with USER_HISTORY
  const { data: foundData, error: foundError } = await supabase
    .from('found_items_with_profile')
    .select('*')
    .eq('user_id', userId)
    .eq('history_type', 'USER_HISTORY')
    .order('concluded_at', { ascending: false });

  if (foundError) {
    console.error('Error fetching user history found items:', foundError);
    throw foundError;
  }

  return {
    lostItems: (lostData || []) as LostItemWithProfile[],
    foundItems: (foundData || []) as FoundItemWithProfile[]
  };
};

// Delete a user's history item (USER_HISTORY only)
export const deleteUserHistoryItem = async (
  itemId: string,
  itemType: 'lost' | 'found',
  userId: string
): Promise<{ success: boolean; message: string }> => {
  const { data, error } = await supabase
    .rpc('delete_user_history_item', {
      p_item_id: itemId,
      p_item_type: itemType,
      p_user_id: userId
    });

  if (error) {
    console.error('Error deleting user history item:', error);
    throw new Error(error.message || 'Failed to delete history item');
  }

  if (!data || data.length === 0) {
    throw new Error('No response from database');
  }

  const result = data[0];
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to delete history item');
  }

  return {
    success: result.success,
    message: result.message
  };
};

// Trigger cleanup of old history items (6 months+)
export const cleanupOldHistoryItems = async (): Promise<{
  deletedLostItems: number;
  deletedFoundItems: number;
  deletedChats: number;
}> => {
  const { data, error } = await supabase
    .rpc('cleanup_old_history_items');

  if (error) {
    console.error('Error cleaning up old history items:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return {
      deletedLostItems: 0,
      deletedFoundItems: 0,
      deletedChats: 0
    };
  }

  const result = data[0];
  
  return {
    deletedLostItems: result.deleted_lost_items || 0,
    deletedFoundItems: result.deleted_found_items || 0,
    deletedChats: result.deleted_chats || 0
  };
};
