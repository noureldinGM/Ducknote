package com.ducknote.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "DuckNoteWidget")
public class DuckNoteWidgetPlugin extends Plugin {

    private static final String PREFS_NAME =
            "ducknote_widget";

    private static final String KEY_NOTE_ID =
            "note_id";

    private static final String KEY_SENDER =
            "sender";

    private static final String KEY_NOTE =
            "note";

    private static final String KEY_TIME =
            "time";

    private static final String KEY_TYPE =
            "type";

    private static final String KEY_AUDIO_URL =
            "audio_url";

    private static final String KEY_REACTED =
            "reacted";

    private static final String KEY_REACTION_AT =
            "reaction_at";

    private static final String SESSION_PREFS_NAME =
            "ducknote_secure_session";

    private static final String KEY_ACCESS_TOKEN =
            "access_token";

    private static final String KEY_REFRESH_TOKEN =
            "refresh_token";

    private static final String KEY_USER_ID =
            "user_id";

    private static final String KEY_SUPABASE_URL =
            "supabase_url";

    private static final String KEY_PUBLISHABLE_KEY =
            "publishable_key";

    private static final String KEYSTORE_PROVIDER =
            "AndroidKeyStore";

    private static final String KEY_ALIAS =
            "DuckNoteWidgetSessionKey";

    private static final String TRANSFORMATION =
            "AES/GCM/NoPadding";

    // =====================================================
    // Widget note
    // =====================================================

    @PluginMethod
    public void updateLatestNote(
            PluginCall call
    ) {
        String noteId =
                call.getString(
                        "noteId",
                        ""
                );

        String sender =
                call.getString(
                        "sender",
                        "Someone"
                );

        String note =
                call.getString(
                        "note",
                        ""
                );

        String time =
                call.getString(
                        "time",
                        "Just now"
                );

        String type =
                call.getString(
                        "type",
                        "text"
                );

        String audioUrl =
                call.getString(
                        "audioUrl",
                        ""
                );

        JSObject data = call.getData();

        boolean hasReaction =
                data.has("reacted") &&
                !data.isNull("reacted");

        boolean reacted =
                hasReaction &&
                call.getBoolean(
                        "reacted",
                        false
                );

        String reactionAt =
                call.getString(
                        "reactionAt",
                        ""
                );

        Context context =
                getContext();

        SharedPreferences prefs =
                context.getSharedPreferences(
                        PREFS_NAME,
                        Context.MODE_PRIVATE
                );

        SharedPreferences.Editor editor =
                prefs.edit();

        String previousNoteId =
                prefs.getString(
                        KEY_NOTE_ID,
                        ""
                );

        String previousReactionAt =
                prefs.getString(
                        KEY_REACTION_AT,
                        ""
                );

        editor
                .putString(
                        KEY_NOTE_ID,
                        noteId
                )
                .putString(
                        KEY_SENDER,
                        sender
                )
                .putString(
                        KEY_NOTE,
                        note
                )
                .putString(
                        KEY_TIME,
                        time
                )
                .putString(
                        KEY_TYPE,
                        type
                )
                .putString(
                        KEY_AUDIO_URL,
                        audioUrl
                );

        if (!noteId.equals(previousNoteId)) {
            // A new note has no existing widget reaction to preserve.
            editor.putBoolean(
                    KEY_REACTED,
                    hasReaction && reacted
            ).putString(
                    KEY_REACTION_AT,
                    hasReaction ? reactionAt : ""
            );
        } else if (
                hasReaction &&
                DuckNoteWidgetProvider
                        .isNewerReactionVersion(
                                reactionAt,
                                previousReactionAt
                        )
        ) {
            editor.putBoolean(
                    KEY_REACTED,
                    reacted
            ).putString(
                    KEY_REACTION_AT,
                    reactionAt
            );
        }

        editor.apply();

        DuckNoteWidgetProvider.updateAllWidgets(
                context
        );

        JSObject result =
                new JSObject();

        result.put(
                "ok",
                true
        );

        call.resolve(result);
    }

    // =====================================================
    // Sync reaction state from web app
    // =====================================================

    @PluginMethod
    public void syncReactionState(
            PluginCall call
    ) {
        String noteId =
                call.getString(
                        "noteId",
                        ""
                );

        boolean reacted =
                call.getBoolean(
                        "reacted",
                        false
                );

        String reactionAt =
                call.getString(
                        "reactionAt",
                        ""
                );

        Context context =
                getContext();

        DuckNoteWidgetProvider.updateReactionState(
                context,
                noteId,
                reacted,
                reactionAt
        );

        JSObject result =
                new JSObject();

        result.put(
                "ok",
                true
        );

        call.resolve(result);
    }

    // =====================================================
    // Secure session
    // =====================================================

    @PluginMethod
    public void syncSession(
            PluginCall call
    ) {
        String accessToken =
                call.getString(
                        "accessToken",
                        ""
                );

        String refreshToken =
                call.getString(
                        "refreshToken",
                        ""
                );

        String userId =
                call.getString(
                        "userId",
                        ""
                );

        String supabaseUrl =
                call.getString(
                        "supabaseUrl",
                        ""
                );

        String publishableKey =
                call.getString(
                        "publishableKey",
                        ""
                );

        if (
                accessToken.isEmpty() ||
                refreshToken.isEmpty() ||
                userId.isEmpty() ||
                supabaseUrl.isEmpty() ||
                publishableKey.isEmpty()
        ) {
            call.reject(
                    "Invalid authentication session."
            );

            return;
        }

        try {
            Context context =
                    getContext();

            SharedPreferences prefs =
                    context.getSharedPreferences(
                            SESSION_PREFS_NAME,
                            Context.MODE_PRIVATE
                    );

            prefs.edit()
                    .putString(
                            KEY_ACCESS_TOKEN,
                            encrypt(accessToken)
                    )
                    .putString(
                            KEY_REFRESH_TOKEN,
                            encrypt(refreshToken)
                    )
                    .putString(
                            KEY_USER_ID,
                            encrypt(userId)
                    )
                    .putString(
                            KEY_SUPABASE_URL,
                            encrypt(supabaseUrl)
                    )
                    .putString(
                            KEY_PUBLISHABLE_KEY,
                            encrypt(publishableKey)
                    )
                    .apply();

            JSObject result =
                    new JSObject();

            result.put(
                    "ok",
                    true
            );

            call.resolve(result);

        } catch (Exception e) {
            call.reject(
                    "Could not securely store session.",
                    e
            );
        }
    }
     // =====================================================
    // Session access for native widget actions
// =====================================================

public static String[] getSession(
        Context context
) throws Exception {

    SharedPreferences prefs =
            context.getSharedPreferences(
                    SESSION_PREFS_NAME,
                    Context.MODE_PRIVATE
            );

    String encryptedAccess =
            prefs.getString(
                    KEY_ACCESS_TOKEN,
                    ""
            );

    String encryptedRefresh =
            prefs.getString(
                    KEY_REFRESH_TOKEN,
                    ""
            );

    String encryptedUserId =
            prefs.getString(
                    KEY_USER_ID,
                    ""
            );

    String encryptedSupabaseUrl =
            prefs.getString(
                    KEY_SUPABASE_URL,
                    ""
            );

    String encryptedPublishableKey =
            prefs.getString(
                    KEY_PUBLISHABLE_KEY,
                    ""
            );

    if (encryptedAccess.isEmpty()
            || encryptedRefresh.isEmpty()
            || encryptedUserId.isEmpty()
            || encryptedSupabaseUrl.isEmpty()
            || encryptedPublishableKey.isEmpty()) {

        return null;
    }

    return new String[]{
            decrypt(encryptedAccess),
            decrypt(encryptedRefresh),
            decrypt(encryptedUserId),
            decrypt(encryptedSupabaseUrl),
            decrypt(encryptedPublishableKey)
    };
}

public static void saveSessionTokens(
        Context context,
        String accessToken,
        String refreshToken
) throws Exception {

    SharedPreferences prefs =
            context.getSharedPreferences(
                    SESSION_PREFS_NAME,
                    Context.MODE_PRIVATE
            );

    prefs.edit()
            .putString(
                    KEY_ACCESS_TOKEN,
                    encrypt(accessToken)
            )
            .putString(
                    KEY_REFRESH_TOKEN,
                    encrypt(refreshToken)
            )
            .apply();
}
    // =====================================================
    // Clear secure session
    // =====================================================

    @PluginMethod
    public void clearSession(
            PluginCall call
    ) {
        Context context =
                getContext();

        SharedPreferences prefs =
                context.getSharedPreferences(
                        SESSION_PREFS_NAME,
                        Context.MODE_PRIVATE
                );

        prefs.edit()
                .clear()
                .apply();

        JSObject result =
                new JSObject();

        result.put(
                "ok",
                true
        );

        call.resolve(result);
    }

    // =====================================================
    // Secure storage helpers
    // =====================================================

    private static SecretKey getOrCreateKey()
            throws Exception {

        KeyStore keyStore =
                KeyStore.getInstance(
                        KEYSTORE_PROVIDER
                );

        keyStore.load(null);

        if (
                keyStore.containsAlias(
                        KEY_ALIAS
                )
        ) {
            return (
                    (KeyStore.SecretKeyEntry)
                            keyStore.getEntry(
                                    KEY_ALIAS,
                                    null
                            )
            ).getSecretKey();
        }

        KeyGenerator keyGenerator =
                KeyGenerator.getInstance(
                        KeyProperties.KEY_ALGORITHM_AES,
                        KEYSTORE_PROVIDER
                );

        KeyGenParameterSpec spec =
                new KeyGenParameterSpec.Builder(
                        KEY_ALIAS,
                        KeyProperties.PURPOSE_ENCRYPT |
                        KeyProperties.PURPOSE_DECRYPT
                )
                        .setBlockModes(
                                KeyProperties.BLOCK_MODE_GCM
                        )
                        .setEncryptionPaddings(
                                KeyProperties.ENCRYPTION_PADDING_NONE
                        )
                        .build();

        keyGenerator.init(spec);

        return keyGenerator.generateKey();
    }

    private static String encrypt(
            String value
    ) throws Exception {

        SecretKey key =
                getOrCreateKey();

        Cipher cipher =
                Cipher.getInstance(
                        TRANSFORMATION
                );

        cipher.init(
                Cipher.ENCRYPT_MODE,
                key
        );

        byte[] iv =
                cipher.getIV();

        byte[] encrypted =
                cipher.doFinal(
                        value.getBytes(
                                StandardCharsets.UTF_8
                        )
                );

        String ivBase64 =
                Base64.encodeToString(
                        iv,
                        Base64.NO_WRAP
                );

        String encryptedBase64 =
                Base64.encodeToString(
                        encrypted,
                        Base64.NO_WRAP
                );

        return ivBase64 +
                ":" +
                encryptedBase64;
    }

    private static String decrypt(
            String stored
    ) throws Exception {

        String[] parts =
                stored.split(
                        ":",
                        2
                );

        if (parts.length != 2) {
            throw new IllegalArgumentException(
                    "Invalid encrypted value."
            );
        }

        byte[] iv =
                Base64.decode(
                        parts[0],
                        Base64.NO_WRAP
                );

        byte[] encrypted =
                Base64.decode(
                        parts[1],
                        Base64.NO_WRAP
                );

        SecretKey key =
                getOrCreateKey();

        Cipher cipher =
                Cipher.getInstance(
                        TRANSFORMATION
                );

        cipher.init(
                Cipher.DECRYPT_MODE,
                key,
                new GCMParameterSpec(
                        128,
                        iv
                )
        );

        byte[] decrypted =
                cipher.doFinal(
                        encrypted
                );

        return new String(
                decrypted,
                StandardCharsets.UTF_8
        );
    }
}
