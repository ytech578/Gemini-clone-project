// Service to handle saving conversations and messages to Supabase
import { supabase } from '../lib/supabase';
import type { ChatMessage } from '../types';

// Save or update a conversation in the database
export async function saveConversationToSupabase(
    conversationId: string,
    title: string,
    model: string = 'gemma-3-27b-it'
) {
    try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session?.user) {
            return null;
        }

        // Upsert (insert or update) the conversation in one call
        const { data, error } = await supabase
            .from('conversations')
            .upsert({
                id: conversationId,
                user_id: session.session.user.id,
                title,
                model,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error saving conversation:', error);
        return null;
    }
}

// Save a message to the database
export async function saveMessageToSupabase(
    conversationId: string,
    message: ChatMessage
) {
    try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session?.user) {
            // User not authenticated - silently skip saving
            return null;
        }

        const content = {
            parts: message.parts
        };

        const { data, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                role: message.role,
                content,
                sources: message.sources || null
            })
            .select()
            .single();

        if (error) {
            // Check for RLS policy violation (403)
            if (error.code === '42501' || error.message?.includes('row-level security')) {
                console.error('RLS Policy Error: Check that the messages table has INSERT policy for authenticated users');
            }
            throw error;
        }
        return data;
    } catch (error) {
        // Only log if it's a real error (not just auth issues)
        const err = error as { code?: string; message?: string };
        if (err.code !== 'PGRST301') {
            console.error('Error saving message:', err.message || error);
        }
        return null;
    }
}

// Load conversation messages from database
export async function loadMessagesFromSupabase(conversationId: string) {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Convert database messages to ChatMessage format
        return (data || []).map((msg) => ({
            role: msg.role as 'user' | 'model' | 'error',
            parts: msg.content.parts || [],
            sources: msg.sources || undefined
        })) as ChatMessage[];
    } catch (error) {
        console.error('Error loading messages:', error);
        return [];
    }
}

// Load all conversations for current user
export async function loadConversationsFromSupabase() {
    try {
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error loading conversations:', error);
        return [];
    }
}

// Delete a conversation
export async function deleteConversationFromSupabase(conversationId: string) {
    try {
        const { error } = await supabase
            .from('conversations')
            .delete()
            .eq('id', conversationId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting conversation:', error);
        return false;
    }
}
