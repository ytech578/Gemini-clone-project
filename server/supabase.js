// server/supabase.js
// Supabase client with SERVICE ROLE for backend operations
// WARNING: Never expose service role key in frontend!

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables in server/.env');
    console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    // Don't exit - let app work without Supabase for now
}

// Create Supabase client with service role (full access, bypasses RLS)
export const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

// Helper to verify user JWT token from frontend
export async function verifyUserToken(authHeader) {
    if (!supabase) return null;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);

    try {
        const { data, error } = await supabase.auth.getUser(token);
        if (error) throw error;
        return data.user;
    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
}

// Helper to save conversation to database
export async function saveConversation(userId, title, model = 'gemma-3-27b-it') {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('conversations')
        .insert({
            user_id: userId,
            title,
            model
        })
        .select()
        .single();

    if (error) {
        console.error('Error saving conversation:', error);
        return null;
    }

    return data;
}

// Helper to save message to database
export async function saveMessage(conversationId, role, content, sources = null) {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            role,
            content,
            sources
        })
        .select()
        .single();

    if (error) {
        console.error('Error saving message:', error);
        return null;
    }

    return data;
}

// Helper to get conversation messages
export async function getConversationMessages(conversationId) {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error getting messages:', error);
        return [];
    }

    return data;
}

// Helper to get user's conversations
export async function getUserConversations(userId) {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error getting conversations:', error);
        return [];
    }

    return data;
}
