package com.angelvmar.voa;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private WebView hiddenWebView;
    private String currentCallbackId;
    private Handler timeoutHandler;
    private boolean yaExtrajo;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView mainWebView = this.bridge.getWebView();
        WebSettings settings = mainWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);

        mainWebView.addJavascriptInterface(new ExtractorBridge(), "NativeExtractor");
        Log.d("VOA_NATIVE", "App iniciada");
    }

    public class ExtractorBridge {
        @JavascriptInterface
        public void extraerTexto(final String url, final String callbackId) {
            Log.d("VOA_NATIVE", "extraerTexto: " + url);
            currentCallbackId = callbackId;
            new Handler(Looper.getMainLooper()).post(new Runnable() {
                @Override
                public void run() {
                    cargarYExtraer(url);
                }
            });
        }
    }

    public class HiddenExtractor {
        @JavascriptInterface
        public void onTexto(final String textoJson) {
            Log.d("VOA_NATIVE", "onTexto len=" + textoJson.length());
            enviarCallbackFinal(textoJson);
        }
    }

    private void cargarYExtraer(String url) {
        yaExtrajo = false;

        if (hiddenWebView == null) {
            Log.d("VOA_NATIVE", "Creando WebView oculta");
            hiddenWebView = new WebView(this);
            hiddenWebView.setLayoutParams(new ViewGroup.LayoutParams(1080, 1920));
            hiddenWebView.setX(-10000);
            hiddenWebView.setY(-10000);

            WebSettings hs = hiddenWebView.getSettings();
            hs.setJavaScriptEnabled(true);
            hs.setDomStorageEnabled(true);
            hs.setLoadsImagesAutomatically(true);
            hs.setUserAgentString("Mozilla/5.0 (Linux; Android 13; SM-A135M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36");

            hiddenWebView.addJavascriptInterface(new HiddenExtractor(), "HiddenNative");

            ViewGroup root = (ViewGroup) this.bridge.getWebView().getParent();
            if (root != null) {
                root.addView(hiddenWebView);
            }
        }

        hiddenWebView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String u) {
                super.onPageFinished(view, u);
                Log.d("VOA_NATIVE", "onPageFinished");
                if (yaExtrajo) return;
                yaExtrajo = true;

                // PASO 1: A los 5s, hacer scroll para disparar lazy loading
                new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        Log.d("VOA_NATIVE", "Scroll progresivo");
                        String jsScroll =
                            "(function(){" +
                            "  var total = document.body.scrollHeight;" +
                            "  window.scrollTo(0, total * 0.3);" +
                            "})()";
                        hiddenWebView.evaluateJavascript(jsScroll, null);
                    }
                }, 5000);

                new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        String jsScroll =
                            "(function(){" +
                            "  var total = document.body.scrollHeight;" +
                            "  window.scrollTo(0, total * 0.6);" +
                            "})()";
                        hiddenWebView.evaluateJavascript(jsScroll, null);
                    }
                }, 10000);

                new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        String jsScroll =
                            "(function(){" +
                            "  window.scrollTo(0, document.body.scrollHeight);" +
                            "})()";
                        hiddenWebView.evaluateJavascript(jsScroll, null);
                    }
                }, 15000);

                // PASO 2: A los 25s, extraer
                new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        Log.d("VOA_NATIVE", "Extrayendo a los 25s");
                        inyectarExtractor();
                    }
                }, 25000);
            }
        });

        if (timeoutHandler != null) timeoutHandler.removeCallbacksAndMessages(null);
        timeoutHandler = new Handler(Looper.getMainLooper());
        timeoutHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                Log.d("VOA_NATIVE", "TIMEOUT 60s");
                enviarCallbackFinal("{\"ok\":false,\"error\":\"timeout\"}");
            }
        }, 60000);

        Log.d("VOA_NATIVE", "loadUrl: " + url);
        hiddenWebView.loadUrl(url);
    }

    private void inyectarExtractor() {
        Log.d("VOA_NATIVE", "Inyectando extractor");

        // Primero, un diagnostico: reportar tamanos
        String jsDiag =
            "(function(){" +
            "  var info = {" +
            "    bodyLen: document.body ? document.body.innerText.length : 0," +
            "    pCount: document.querySelectorAll('p').length," +
            "    wswCount: document.querySelectorAll('.wsw').length," +
            "    contentOffset: document.querySelectorAll('.content-offset').length," +
            "    articleCount: document.querySelectorAll('article').length," +
            "    springtime: document.body.innerText.indexOf('Springtime') >= 0," +
            "    renewal: document.body.innerText.indexOf('renewal') >= 0," +
            "    wordsInThisStory: document.body.innerText.indexOf('Words in This Story') >= 0" +
            "  };" +
            "  HiddenNative.onTexto(JSON.stringify({ok:false,error:'DIAG',info:info}));" +
            "})()";
        hiddenWebView.evaluateJavascript(jsDiag, null);

        // Esperar 2s y extraer el texto de parrafos
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                String js =
                    "(function(){" +
                    "try{" +
                    "  var ps = document.querySelectorAll('p');" +
                    "  var lineas = [];" +
                    "  for (var i = 0; i < ps.length; i++) {" +
                    "    var t = (ps[i].innerText || '').trim();" +
                    "    if (t.length > 20 && /[a-zA-Z]/.test(t)) lineas.push(t);" +
                    "  }" +
                    "  var texto = lineas.join('\\n\\n');" +
                    "  HiddenNative.onTexto(JSON.stringify({ok:true,texto:texto,longitud:texto.length}));" +
                    "}catch(e){" +
                    "  HiddenNative.onTexto(JSON.stringify({ok:false,error:String(e)}));" +
                    "}" +
                    "})()";
                hiddenWebView.evaluateJavascript(js, null);
            }
        }, 2000);
    }

    private void enviarCallbackFinal(String resultadoJson) {
        if (timeoutHandler != null) timeoutHandler.removeCallbacksAndMessages(null);

        String callbackId = currentCallbackId;
        currentCallbackId = null;
        if (callbackId == null) {
            Log.d("VOA_NATIVE", "Sin callbackId");
            return;
        }

        String escaped = escapeForJsString(resultadoJson);
        String js = "if(window.__onNativeExtract){window.__onNativeExtract(\"" + callbackId + "\",\"" + escaped + "\");}";
        Log.d("VOA_NATIVE", "Enviando callback " + callbackId);
        this.bridge.getWebView().evaluateJavascript(js, null);
    }

    private String escapeForJsString(String s) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '\\': sb.append("\\\\"); break;
                case '"': sb.append("\\\""); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int)c));
                    else sb.append(c);
            }
        }
        return sb.toString();
    }
}
