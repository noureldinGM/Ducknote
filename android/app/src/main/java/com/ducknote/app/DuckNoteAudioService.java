package com.ducknote.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

import org.json.JSONObject;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class DuckNoteAudioService extends Service {

    public static final String ACTION_TOGGLE =
            "com.ducknote.app.WIDGET_AUDIO_TOGGLE";

    public static final String EXTRA_NOTE_ID =
            "note_id";

    // Kept for compatibility with the existing widget code.
    // The service does NOT rely on this value anymore.
    public static final String EXTRA_AUDIO_URL =
            "audio_url";

    private static final String PREFS_NAME =
            "ducknote_widget";

    private static final String KEY_PLAYING =
            "playing";

    private static final String CHANNEL_ID =
            "ducknote_audio";

    private static final int NOTIFICATION_ID =
            4101;

    private MediaPlayer player;

    private String currentUrl = "";

    private String currentNoteId = "";

    private final Handler mainHandler =
            new Handler(
                    Looper.getMainLooper()
            );

    @Override
    public void onCreate() {
        super.onCreate();

        createNotificationChannel();
    }

    // =====================================================
    // Service command
    // =====================================================

    @Override
    public int onStartCommand(
            Intent intent,
            int flags,
            int startId
    ) {

        if (intent == null) {
            stopSelfSafe();
            return START_NOT_STICKY;
        }

        String action =
                intent.getAction();

        if (!ACTION_TOGGLE.equals(action)) {
            stopSelfSafe();
            return START_NOT_STICKY;
        }

        String noteId =
                intent.getStringExtra(
                        EXTRA_NOTE_ID
                );

        if (
                noteId == null ||
                noteId.isEmpty()
        ) {

            stopSelfSafe();

            return START_NOT_STICKY;
        }

        /*
         * IMPORTANT:
         *
         * Android requires startForeground() within
         * ~5-10 seconds of startForegroundService().
         *
         * Show a "Loading" notification immediately,
         * BEFORE any network or MediaPlayer work.
         */
        if (
                player == null ||
                !noteId.equals(currentNoteId)
        ) {
            showForegroundNotification(
                    "Loading audio\u2026"
            );
        }

        toggleNote(noteId);

        return START_NOT_STICKY;
    }

    private void stopSelfSafe() {
        try {
            stopForeground(
                    STOP_FOREGROUND_REMOVE
            );
        } catch (Exception ignored) {
        }
        stopSelf();
    }

    // =====================================================
    // Toggle
    // =====================================================

    private void toggleNote(
            String noteId
    ) {

        /*
         * Same note:
         * pause/resume the currently loaded player.
         */
        if (
                player != null &&
                noteId.equals(currentNoteId)
        ) {

            if (player.isPlaying()) {

                player.pause();

                setWidgetPlaying(false);

            } else {

                try {

                    player.start();

                    setWidgetPlaying(true);

                } catch (Exception e) {

                    e.printStackTrace();

                    setWidgetPlaying(false);
                }
            }

            return;
        }

        /*
         * Different note:
         * stop the old player and fetch the new
         * audio URL from Supabase.
         */

        releasePlayer();

        currentNoteId = noteId;

        setWidgetPlaying(false);

        fetchFreshAudioUrl(noteId);
    }

    // =====================================================
    // Get fresh audio URL
    // =====================================================

    private void fetchFreshAudioUrl(
            String noteId
    ) {

        new Thread(() -> {

            HttpURLConnection connection =
                    null;

            try {

                /*
                 * IMPORTANT:
                 *
                 * getSession() returns String[]:
                 *
                 * [0] access token
                 * [1] refresh token
                 * [2] user id
                 * [3] Supabase URL
                 * [4] publishable key
                 */

                String[] session =
                        DuckNoteWidgetPlugin.getSession(
                                this
                        );

                if (
                        session == null ||
                        session.length < 5
                ) {

                    throw new Exception(
                            "DuckNote session is unavailable."
                    );
                }

                String accessToken =
                        session[0];

                String refreshToken =
                        session[1];

                String userId =
                        session[2];

                String supabaseUrl =
                        session[3];

                String publishableKey =
                        session[4];

                if (
                        accessToken == null ||
                        accessToken.isEmpty() ||
                        userId == null ||
                        userId.isEmpty() ||
                        supabaseUrl == null ||
                        supabaseUrl.isEmpty() ||
                        publishableKey == null ||
                        publishableKey.isEmpty()
                ) {

                    throw new Exception(
                            "Incomplete DuckNote session."
                    );
                }

                String endpoint =
                        supabaseUrl
                                + "/functions/v1/notes";

                JSONObject body =
                        new JSONObject();

                body.put(
                        "action",
                        "getNote"
                );

                body.put(
                        "noteId",
                        noteId
                );

                body.put(
                        "id",
                        userId
                );

                // First attempt
                int status =
                        -1;

                String response =
                        "";

                connection =
                        openPostConnection(
                                endpoint,
                                publishableKey,
                                accessToken,
                                body.toString()
                        );

                status =
                        connection.getResponseCode();

                InputStream stream =
                        status >= 200 &&
                        status < 300
                                ? connection.getInputStream()
                                : connection.getErrorStream();

                response =
                        readStream(stream);

                connection.disconnect();
                connection = null;

                // ==============================================
                // 401 â€” refresh token and retry
                // ==============================================

                if (status == 401) {

                    String[] refreshed =
                            refreshSession(
                                    supabaseUrl,
                                    publishableKey,
                                    refreshToken
                            );

                    if (refreshed == null) {
                        throw new Exception(
                                "Session refresh failed."
                        );
                    }

                    accessToken =
                            refreshed[0];

                    connection =
                            openPostConnection(
                                    endpoint,
                                    publishableKey,
                                    accessToken,
                                    body.toString()
                            );

                    status =
                            connection.getResponseCode();

                    stream =
                            status >= 200 &&
                            status < 300
                                    ? connection.getInputStream()
                                    : connection.getErrorStream();

                    response =
                            readStream(stream);

                    connection.disconnect();
                    connection = null;
                }

                if (
                        status < 200 ||
                        status >= 300
                ) {

                    throw new Exception(
                            "Notes request failed: "
                                    + status
                                    + " "
                                    + response
                    );
                }

                JSONObject json =
                        new JSONObject(
                                response
                        );

                if (
                        json.has("error") &&
                        !json.isNull("error")
                ) {

                    throw new Exception(
                            json.optString(
                                    "error",
                                    "Unable to load note."
                            )
                    );
                }

                /*
                 * The Edge Function returns:
                 * { "note": { "audioUrl": "...", ... } }
                 *
                 * Extract the nested note object first.
                 */

                JSONObject noteObj =
                        json.optJSONObject(
                                "note"
                        );

                if (noteObj == null) {
                    // Fallback: try top-level fields
                    noteObj = json;
                }

                String audioUrl =
                        noteObj.optString(
                                "audioUrl",
                                ""
                        );

                if (
                        audioUrl.isEmpty()
                ) {

                    audioUrl =
                            noteObj.optString(
                                    "audio_url",
                                    ""
                            );
                }

                if (
                        audioUrl.isEmpty()
                ) {

                    throw new Exception(
                            "No playable audio URL was returned."
                    );
                }

                final String finalAudioUrl =
                        audioUrl;

                /*
                 * Move playback setup onto the
                 * Android main thread.
                 *
                 * Service does not have runOnUiThread(),
                 * so we use Handler instead.
                 */

                mainHandler.post(() -> {

                    playFreshUrl(
                            noteId,
                            finalAudioUrl
                    );
                });

            } catch (Exception e) {

                e.printStackTrace();

                mainHandler.post(() -> {

                    setWidgetPlaying(false);

                    releasePlayer();

                    stopForeground(
                            STOP_FOREGROUND_REMOVE
                    );

                    stopSelf();
                });

            } finally {

                if (connection != null) {

                    connection.disconnect();
                }
            }

        }).start();
    }

    // =====================================================
    // Start playback
    // =====================================================

    private void playFreshUrl(
            String noteId,
            String audioUrl
    ) {

        if (
                !noteId.equals(currentNoteId)
        ) {

            return;
        }

        releasePlayer();

        currentNoteId =
                noteId;

        currentUrl =
                audioUrl;

        player =
                new MediaPlayer();

        player.setOnPreparedListener(
                mp -> {

                    try {

                        showForegroundNotification(
                                "Playing your note"
                        );

                        mp.start();

                        setWidgetPlaying(
                                true
                        );

                    } catch (Exception e) {

                        e.printStackTrace();

                        setWidgetPlaying(
                                false
                        );

                        releasePlayer();

                        stopForeground(
                                STOP_FOREGROUND_REMOVE
                        );

                        stopSelf();
                    }
                }
        );

        player.setOnCompletionListener(
                mp -> {

                    setWidgetPlaying(
                            false
                    );

                    releasePlayer();

                    stopForeground(
                            STOP_FOREGROUND_REMOVE
                    );

                    stopSelf();
                }
        );

        player.setOnErrorListener(
                (mp, what, extra) -> {

                    setWidgetPlaying(
                            false
                    );

                    releasePlayer();

                    stopForeground(
                            STOP_FOREGROUND_REMOVE
                    );

                    stopSelf();

                    return true;
                }
        );

        try {

            player.setDataSource(
                    audioUrl
            );

            player.prepareAsync();

        } catch (Exception e) {

            e.printStackTrace();

            setWidgetPlaying(
                    false
            );

            releasePlayer();

            stopForeground(
                    STOP_FOREGROUND_REMOVE
            );

            stopSelf();
        }
    }

    // =====================================================
    // Foreground playback notification
    // =====================================================

    private void showForegroundNotification(
            String contentText
    ) {

        Notification notification =
                new NotificationCompat.Builder(
                        this,
                        CHANNEL_ID
                )
                        .setSmallIcon(
                                R.mipmap.ic_launcher
                        )
                        .setContentTitle(
                                "DuckNote"
                        )
                        .setContentText(
                                contentText
                        )
                        .setCategory(
                                NotificationCompat.CATEGORY_TRANSPORT
                        )
                        .setOngoing(true)
                        .setOnlyAlertOnce(true)
                        .build();

        if (
                Build.VERSION.SDK_INT >= 29
        ) {

            ServiceCompat.startForeground(
                    this,
                    NOTIFICATION_ID,
                    notification,
                    android.content.pm.ServiceInfo
                            .FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            );

        } else {

            startForeground(
                    NOTIFICATION_ID,
                    notification
            );
        }
    }

    // =====================================================
    // Widget playing state
    // =====================================================

    private void setWidgetPlaying(
            boolean playing
    ) {

        getSharedPreferences(
                PREFS_NAME,
                MODE_PRIVATE
        )
                .edit()
                .putBoolean(
                        KEY_PLAYING,
                        playing
                )
                .apply();

        DuckNoteWidgetProvider
                .updateAllWidgets(
                        this
                );
    }

    // =====================================================
    // Release player
    // =====================================================

    private void releasePlayer() {

        if (player != null) {

            try {

                if (player.isPlaying()) {
                    player.stop();
                }

            } catch (Exception ignored) {
            }

            try {

                player.release();

            } catch (Exception ignored) {
            }

            player = null;
        }

        currentUrl = "";
    }

    // =====================================================
    // Notification channel
    // =====================================================

    private void createNotificationChannel() {

        if (
                Build.VERSION.SDK_INT <
                Build.VERSION_CODES.O
        ) {

            return;
        }

        NotificationChannel channel =
                new NotificationChannel(
                        CHANNEL_ID,
                        "DuckNote Audio",
                        NotificationManager
                                .IMPORTANCE_LOW
                );

        channel.setDescription(
                "Audio playback from DuckNote widgets"
        );

        NotificationManager manager =
                getSystemService(
                        NotificationManager.class
                );

        if (manager != null) {

            manager.createNotificationChannel(
                    channel
            );
        }
    }

    // =====================================================
    // Read HTTP response
    // =====================================================

    private String readStream(
            InputStream stream
    ) throws Exception {

        if (stream == null) {
            return "";
        }

        StringBuilder result =
                new StringBuilder();

        try (
                java.io.BufferedReader reader =
                        new java.io.BufferedReader(
                                new java.io.InputStreamReader(
                                        stream,
                                        StandardCharsets.UTF_8
                                )
                        )
        ) {

            String line;

            while (
                    (line = reader.readLine())
                            != null
            ) {

                result.append(line);
            }
        }

        return result.toString();
    }

    // =====================================================
    // HTTP helper
    // =====================================================

    private HttpURLConnection openPostConnection(
            String urlString,
            String apiKey,
            String accessToken,
            String body
    ) throws Exception {

        HttpURLConnection connection =
                (HttpURLConnection)
                        new URL(urlString)
                                .openConnection();

        connection.setRequestMethod(
                "POST"
        );

        connection.setConnectTimeout(
                15000
        );

        connection.setReadTimeout(
                20000
        );

        connection.setDoOutput(
                true
        );

        connection.setRequestProperty(
                "Content-Type",
                "application/json"
        );

        connection.setRequestProperty(
                "apikey",
                apiKey
        );

        connection.setRequestProperty(
                "Authorization",
                "Bearer " + accessToken
        );

        byte[] bytes =
                body.getBytes(
                        StandardCharsets.UTF_8
                );

        try (
                OutputStream output =
                        connection.getOutputStream()
        ) {
            output.write(bytes);
        }

        return connection;
    }

    // =====================================================
    // Refresh session
    // =====================================================

    private String[] refreshSession(
            String supabaseUrl,
            String publishableKey,
            String refreshToken
    ) throws Exception {

        if (
                refreshToken == null ||
                refreshToken.isEmpty()
        ) {
            return null;
        }

        JSONObject payload =
                new JSONObject();

        payload.put(
                "refresh_token",
                refreshToken
        );

        String refreshUrl =
                supabaseUrl
                        + "/auth/v1/token"
                        + "?grant_type=refresh_token";

        HttpURLConnection connection =
                openPostConnection(
                        refreshUrl,
                        publishableKey,
                        null,
                        payload.toString()
                );

        int status =
                connection.getResponseCode();

        InputStream stream =
                status >= 200 &&
                status < 300
                        ? connection.getInputStream()
                        : connection.getErrorStream();

        String responseBody =
                readStream(stream);

        connection.disconnect();

        if (
                status < 200 ||
                status >= 300
        ) {
            return null;
        }

        JSONObject body =
                new JSONObject(
                        responseBody
                );

        String accessToken =
                body.optString(
                        "access_token",
                        ""
                );

        String newRefreshToken =
                body.optString(
                        "refresh_token",
                        refreshToken
                );

        if (accessToken.isEmpty()) {
            return null;
        }

        DuckNoteWidgetPlugin
                .saveSessionTokens(
                        this,
                        accessToken,
                        newRefreshToken
                );

        return new String[]{
                accessToken,
                newRefreshToken
        };
    }

    // =====================================================
    // Destroy
    // =====================================================

    @Override
    public void onDestroy() {

        releasePlayer();

        setWidgetPlaying(
                false
        );

        super.onDestroy();
    }

    // =====================================================
    // Binding
    // =====================================================

    @Override
    public IBinder onBind(
            Intent intent
    ) {
        return null;
    }
}