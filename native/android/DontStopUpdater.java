package com.stikerpo.dontstop;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "DontStopUpdater")
public class DontStopUpdater extends Plugin {
    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        final String urlString = call.getString("url");
        final String requestedFileName = call.getString("fileName", "DONT-STOP.apk");

        if (urlString == null || !urlString.startsWith("https://github.com/stikerpo-spec/DONT-STOP/")) {
            call.reject("Ungültige Update-Quelle.");
            return;
        }

        new Thread(() -> {
            File apk = new File(getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS),
                    requestedFileName.replaceAll("[^A-Za-z0-9._-]", "_"));

            HttpURLConnection connection = null;
            try {
                URL url = new URL(urlString);
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(20000);
                connection.setReadTimeout(120000);
                connection.setInstanceFollowRedirects(true);
                connection.setRequestProperty("User-Agent", "DON-T-STOP-Updater");
                connection.connect();

                int status = connection.getResponseCode();
                if (status < 200 || status >= 300) {
                    throw new IllegalStateException("GitHub-Download fehlgeschlagen (HTTP " + status + ").");
                }

                File parent = apk.getParentFile();
                if (parent != null && !parent.exists() && !parent.mkdirs()) {
                    throw new IllegalStateException("Download-Ordner konnte nicht erstellt werden.");
                }

                try (InputStream input = connection.getInputStream();
                     FileOutputStream output = new FileOutputStream(apk)) {
                    byte[] buffer = new byte[64 * 1024];
                    int read;
                    while ((read = input.read(buffer)) != -1) {
                        output.write(buffer, 0, read);
                    }
                    output.flush();
                }

                if (!apk.exists() || apk.length() < 1024) {
                    throw new IllegalStateException("Die APK wurde nicht vollständig heruntergeladen.");
                }

                Context context = getContext();
                Uri apkUri = FileProvider.getUriForFile(
                        context,
                        context.getPackageName() + ".fileprovider",
                        apk
                );

                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);

                getActivity().runOnUiThread(() -> {
                    try {
                        context.startActivity(installIntent);
                        JSObject result = new JSObject();
                        result.put("started", true);
                        call.resolve(result);
                    } catch (Exception error) {
                        call.reject("Android-Installer konnte nicht geöffnet werden: " + error.getMessage());
                    }
                });
            } catch (Exception error) {
                apk.delete();
                call.reject(error.getMessage() == null ? "Update fehlgeschlagen." : error.getMessage());
            } finally {
                if (connection != null) connection.disconnect();
            }
        }, "dont-stop-updater").start();
    }
}
