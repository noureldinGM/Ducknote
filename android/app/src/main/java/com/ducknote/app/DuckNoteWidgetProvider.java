package com.ducknote.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class DuckNoteWidgetProvider extends AppWidgetProvider {

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

    private static final String KEY_PLAYING =
            "playing";

    public static final String ACTION_REACT =
            "com.ducknote.app.WIDGET_REACT";

    public static final String ACTION_PLAY =
            "com.ducknote.app.WIDGET_PLAY";

    public static final String EXTRA_NOTE_ID =
            "note_id";

    private static final ExecutorService EXECUTOR =
            Executors.newSingleThreadExecutor();

    // =====================================================
    // Widget update
    // =====================================================

    @Override
    public void onUpdate(
            Context context,
            AppWidgetManager appWidgetManager,
            int[] appWidgetIds
    ) {
        for (int appWidgetId : appWidgetIds) {

            updateWidget(
                    context,
                    appWidgetManager,
                    appWidgetId
            );
        }
    }

    public static void updateAllWidgets(
            Context context
    ) {
        AppWidgetManager manager =
                AppWidgetManager.getInstance(context);

        ComponentName componentName =
                new ComponentName(
                        context,
                        DuckNoteWidgetProvider.class
                );

        int[] ids =
                manager.getAppWidgetIds(
                        componentName
                );

        for (int appWidgetId : ids) {

            updateWidget(
                    context,
                    manager,
                    appWidgetId
            );
        }
    }

    // =====================================================
    // Broadcast actions
    // =====================================================

    @Override
    public void onReceive(
            Context context,
            Intent intent
    ) {
        super.onReceive(
                context,
                intent
        );

        if (intent == null) {
            return;
        }

        String action =
                intent.getAction();

        // =================================================
        // Reaction
        // =================================================

        if (ACTION_REACT.equals(action)) {

            String noteId =
                    intent.getStringExtra(
                            EXTRA_NOTE_ID
                    );

            if (
                    noteId == null ||
                    noteId.isEmpty()
            ) {
                return;
            }

            PendingResult pendingResult =
                    goAsync();

            EXECUTOR.execute(() -> {

                try {

                    performReaction(
                            context.getApplicationContext(),
                            noteId
                    );

                } catch (Exception e) {

                    e.printStackTrace();

                } finally {

                    pendingResult.finish();
                }
            });

            return;
        }

        // =================================================
        // Audio
        // =================================================

        if (ACTION_PLAY.equals(action)) {

            String noteId =
                    intent.getStringExtra(
                            EXTRA_NOTE_ID
                    );

            if (
                    noteId == null ||
                    noteId.isEmpty()
            ) {
                return;
            }

            SharedPreferences prefs =
                    context.getSharedPreferences(
                            PREFS_NAME,
                            Context.MODE_PRIVATE
                    );

            String type =
                    prefs.getString(
                            KEY_TYPE,
                            "text"
                    );

            String audioUrl =
                    prefs.getString(
                            KEY_AUDIO_URL,
                            ""
                    );

            // Never try to play a text note.
            if (
                    !"audio".equals(type) ||
                    audioUrl.isEmpty()
            ) {
                return;
            }

            Intent serviceIntent =
                    new Intent(
                            context,
                            DuckNoteAudioService.class
                    );

            serviceIntent.setAction(
                    DuckNoteAudioService.ACTION_TOGGLE
            );

            serviceIntent.putExtra(
                    DuckNoteAudioService.EXTRA_NOTE_ID,
                    noteId
            );

            /*
             * IMPORTANT:
             *
             * Do NOT pass the stored audio URL.
             *
             * DuckNoteAudioService will retrieve a fresh
             * playable URL using the authenticated session.
             */

            if (
                    Build.VERSION.SDK_INT >=
                    Build.VERSION_CODES.O
            ) {

                context.startForegroundService(
                        serviceIntent
                );

            } else {

                context.startService(
                        serviceIntent
                );
            }

            return;
        }
    }

    // =====================================================
    // Render widget
    // =====================================================

    private static void updateWidget(
            Context context,
            AppWidgetManager appWidgetManager,
            int appWidgetId
    ) {

        RemoteViews views =
                new RemoteViews(
                        context.getPackageName(),
                        R.layout.ducknote_widget
                );

        SharedPreferences prefs =
                context.getSharedPreferences(
                        PREFS_NAME,
                        Context.MODE_PRIVATE
                );

        String noteId =
                prefs.getString(
                        KEY_NOTE_ID,
                        ""
                );

        String sender =
                prefs.getString(
                        KEY_SENDER,
                        "Someone"
                );

        String note =
                prefs.getString(
                        KEY_NOTE,
                        "No notes yet"
                );

        String time =
                prefs.getString(
                        KEY_TIME,
                        "Just now"
                );

        String type =
                prefs.getString(
                        KEY_TYPE,
                        "text"
                );

        String audioUrl =
                prefs.getString(
                        KEY_AUDIO_URL,
                        ""
                );

        boolean reacted =
                prefs.getBoolean(
                        KEY_REACTED,
                        false
                );

        boolean playing =
                prefs.getBoolean(
                        KEY_PLAYING,
                        false
                );

        boolean isAudio =
                "audio".equals(type);

        // =================================================
        // Basic content
        // =================================================

        views.setTextViewText(
                R.id.widget_sender,
                sender
        );

        if (
                isAudio &&
                (
                        note == null ||
                        note.trim().isEmpty()
                )
        ) {

            note = "\u266B Audio note";
        }

        views.setTextViewText(
                R.id.widget_note,
                note
        );

        views.setTextViewText(
                R.id.widget_time,
                time
        );

        // =================================================
        // Reaction button
        // =================================================

        if (noteId.isEmpty()) {

            views.setViewVisibility(
                    R.id.widget_react,
                    View.GONE
            );

        } else {

            views.setViewVisibility(
                    R.id.widget_react,
                    View.VISIBLE
            );

            views.setTextViewText(
                    R.id.widget_react,
                    reacted
                            ? "\u2665"
                            : "\u2661"
            );

            Intent reactIntent =
                    new Intent(
                            context,
                            DuckNoteWidgetProvider.class
                    );

            reactIntent.setAction(
                    ACTION_REACT
            );

            reactIntent.putExtra(
                    EXTRA_NOTE_ID,
                    noteId
            );

            PendingIntent reactPendingIntent =
                    PendingIntent.getBroadcast(
                            context,
                            200,
                            reactIntent,
                            PendingIntent.FLAG_UPDATE_CURRENT
                                    | PendingIntent.FLAG_IMMUTABLE
                    );

            views.setOnClickPendingIntent(
                    R.id.widget_react,
                    reactPendingIntent
            );
        }

        // =================================================
        // Audio button
        // =================================================

        if (isAudio) {

            views.setViewVisibility(
                    R.id.widget_play,
                    View.VISIBLE
            );

            views.setTextViewText(
                    R.id.widget_play,
                    playing
                            ? "\u23F8"
                            : "\u25B6"
            );

            Intent playIntent =
                    new Intent(
                            context,
                            DuckNoteWidgetProvider.class
                    );

            playIntent.setAction(
                    ACTION_PLAY
            );

            playIntent.putExtra(
                    EXTRA_NOTE_ID,
                    noteId
            );

            PendingIntent playPendingIntent =
                    PendingIntent.getBroadcast(
                            context,
                            300,
                            playIntent,
                            PendingIntent.FLAG_UPDATE_CURRENT
                                    | PendingIntent.FLAG_IMMUTABLE
            );

            views.setOnClickPendingIntent(
                    R.id.widget_play,
                    playPendingIntent
            );

        } else {

            views.setViewVisibility(
                    R.id.widget_play,
                    View.GONE
            );
        }

        // =================================================
        // Open note
        // =================================================

        Intent openIntent =
                new Intent(
                        context,
                        MainActivity.class
                );

        openIntent.setFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK
                        | Intent.FLAG_ACTIVITY_CLEAR_TOP
        );

        PendingIntent openPendingIntent =
                PendingIntent.getActivity(
                        context,
                        100,
                        openIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT
                                | PendingIntent.FLAG_IMMUTABLE
                );

        views.setOnClickPendingIntent(
                R.id.widget_note_container,
                openPendingIntent
        );

        // =================================================
        // Apply widget update
        // =================================================

        appWidgetManager.updateAppWidget(
                appWidgetId,
                views
        );
    }

    // =====================================================
    // Reaction
    // =====================================================

    private static void performReaction(
            Context context,
            String noteId
    ) throws Exception {

        String[] session =
                DuckNoteWidgetPlugin.getSession(
                        context
                );

        if (session == null
                || session.length < 5) {

            return;
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
            return;
        }

        JSONObject payload =
                new JSONObject();

        payload.put(
                "action",
                "react"
        );

        payload.put(
                "noteId",
                noteId
        );

        payload.put(
                "id",
                userId
        );

        payload.put(
                "token",
                accessToken
        );

        String functionUrl =
                supabaseUrl
                        + "/functions/v1/notes";

        HttpResult result =
                postJson(
                        functionUrl,
                        publishableKey,
                        accessToken,
                        payload.toString()
                );

        // =================================================
        // Access token expired
        // =================================================

        if (result.status == 401) {

            String[] refreshed =
                    refreshSession(
                            context,
                            supabaseUrl,
                            publishableKey,
                            refreshToken
                    );

            if (refreshed == null) {
                return;
            }

            accessToken =
                    refreshed[0];

            payload.put(
                    "token",
                    accessToken
            );

            result =
                    postJson(
                            functionUrl,
                            publishableKey,
                            accessToken,
                            payload.toString()
                    );
        }

        // =================================================
        // Validate server response
        // =================================================

        if (
                result.status < 200 ||
                result.status >= 300
        ) {

            throw new Exception(
                    "Widget reaction failed: HTTP "
                            + result.status
                            + " "
                            + result.body
            );
        }

        JSONObject response =
                new JSONObject(
                        result.body == null
                                ? "{}"
                                : result.body
                );

        if (
                response.has("error") &&
                !response.isNull("error")
        ) {

            throw new Exception(
                    response.optString(
                            "error",
                            "Reaction failed."
                    )
            );
        }

        SharedPreferences prefs =
                context.getSharedPreferences(
                        PREFS_NAME,
                        Context.MODE_PRIVATE
                );

        boolean current =
                prefs.getBoolean(
                        KEY_REACTED,
                        false
                );

        boolean reacted;

        if (response.has("reaction")
                && !response.isNull("reaction")) {

            JSONObject reactionObj =
                    response.optJSONObject(
                            "reaction"
                    );

            if (reactionObj != null) {

                reacted =
                        reactionObj.optBoolean(
                                "heart",
                                !current
                        );

            } else {

                reacted = !current;
            }

        } else {

            reacted = !current;
        }

        prefs.edit()
                .putBoolean(
                        KEY_REACTED,
                        reacted
                )
                .apply();

        updateAllWidgets(
                context
        );
    }

    // =====================================================
    // Refresh session
    // =====================================================

    private static String[] refreshSession(
            Context context,
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

        HttpResult result =
                postJson(
                        refreshUrl,
                        publishableKey,
                        null,
                        payload.toString()
                );

        if (
                result.status < 200 ||
                result.status >= 300
        ) {

            return null;
        }

        JSONObject body =
                new JSONObject(
                        result.body
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
                        context,
                        accessToken,
                        newRefreshToken
                );

        return new String[]{
                accessToken,
                newRefreshToken
        };
    }

    // =====================================================
    // HTTP
    // =====================================================

    private static HttpResult postJson(
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
                15000
        );

        connection.setDoOutput(
                true
        );

        connection.setRequestProperty(
                "Content-Type",
                "application/json"
        );

        if (
                apiKey != null &&
                !apiKey.isEmpty()
        ) {

            connection.setRequestProperty(
                    "apikey",
                    apiKey
            );
        }

        if (
                accessToken != null &&
                !accessToken.isEmpty()
        ) {

            connection.setRequestProperty(
                    "Authorization",
                    "Bearer " + accessToken
            );
        }

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

        int status =
                connection.getResponseCode();

        InputStream stream =
                status >= 400
                        ? connection.getErrorStream()
                        : connection.getInputStream();

        String responseBody =
                readStream(stream);

        connection.disconnect();

        return new HttpResult(
                status,
                responseBody
        );
    }

    private static String readStream(
            InputStream stream
    ) throws Exception {

        if (stream == null) {
            return "";
        }

        StringBuilder result =
                new StringBuilder();

        try (
                BufferedReader reader =
                        new BufferedReader(
                                new InputStreamReader(
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
    // HTTP result
    // =====================================================

    private static class HttpResult {

        final int status;

        final String body;

        HttpResult(
                int status,
                String body
        ) {

            this.status = status;
            this.body = body;
        }
    }
}