package com.angelvmar.voa;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
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
        Log.d("VOA_NATIVE", "App iniciada, NativeExtractor registrado");
    }

    // ============ PUENTE JS <-> JAVA ============
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

    // ============ EXTRACCION ============
    private void cargarYExtraer(String url) {
        yaExtrajo = false;

        if (hiddenWebView == null) {
            Log.d("VOA_NATIVE", "Creando WebView oculta");
            hiddenWebView = new WebView(this);
            hiddenWebView.setLayoutParams(new ViewGroup.LayoutParams(1024, 768));
            hiddenWebView.setX(-10000);
            hiddenWebView.setY(-10000);

            WebSettings hs = hiddenWebView.getSettings();
            hs.setJavaScriptEnabled(true);
            hs.setDomStorageEnabled(true);
            hs.setUserAgentString("Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36");

            hiddenWebView.addJavascriptInterface(new HiddenExtractor(), "HiddenNative");

            ViewGroup root = (ViewGroup) this.bridge.getWebView().getParent();
            if (root != null) {
                root.addView(hiddenWebView);
            } else {
                Log.d("VOA_NATIVE", "No se encontro root view");
            }
        }

        hiddenWebView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String u) {
                super.onPageFinished(view, u);
                Log.d("VOA_NATIVE", "onPageFinished");
                if (yaExtrajo) return;
                yaExtrajo = true;
                new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        inyectarExtractor();
                    }
                }, 8000);
            }
        });

        if (timeoutHandler != null) timeoutHandler.removeCallbacksAndMessages(null);
        timeoutHandler = new Handler(Looper.getMainLooper());
        timeoutHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                Log.d("VOA_NATIVE", "TIMEOUT");
                enviarCallbackFinal("{\"ok\":false,\"error\":\"timeout\"}");
            }
        }, 30000);

        Log.d("VOA_NATIVE", "loadUrl: " + url);
        hiddenWebView.loadUrl(url);
    }

    private void inyectarExtractor() {
        Log.d("VOA_NATIVE", "Inyectando extractor");
        String js =
            "(function(){" +
            "try{" +
            "  var el = document.querySelector('.wsw') || document.querySelector('[itemprop=\"articleBody\"]') || document.querySelector('.article-content') || document.querySelector('article') || document.querySelector('main');" +
            "  if(!el){" +
            "    HiddenNative.onTexto(JSON.stringify({ok:false,error:'no container',bodyLen:document.body?document.body.innerText.length:0}));" +
            "    return;" +
            "  }" +
            "  var texto = el.innerText || '';" +
            "  var lineas = texto.split('\\n').map(function(l){return l.trim();}).filter(function(l){" +
            "    if(!l || l.length < 3) return false;" +
            "    if(!/[A-Za-z]/.test(l)) return false;" +
            "    if(/^(Download Lesson|Your browser doesn|Speaking Practice|Pronunciation|Conversation|Learn the alphabet|Listening Quiz|Video|Audio|Subscribe|Share|Embed|Previous|Next|Advertisement)$/i.test(l)) return false;" +
            "    return true;" +
            "  });" +
            "  var limpio = lineas.join('\\n\\n').replace(/\\n{3,}/g, '\\n\\n').trim();" +
            "  HiddenNative.onTexto(JSON.stringify({ok:true,texto:limpio,longitud:limpio.length}));" +
            "}catch(e){" +
            "  HiddenNative.onTexto(JSON.stringify({ok:false,error:String(e)}));" +
            "}" +
            "})()";
        hiddenWebView.evaluateJavascript(js, null);
    }

    private void enviarCallbackFinal(String resultadoJson) {
        if (timeoutHandler != null) timeoutHandler.removeCallbacksAndMessages(null);

        String callbackId = currentCallbackId;
        currentCallbackId = null;
        if (callbackId == null) {
            Log.d("VOA_NATIVE", "Sin callbackId, ignorando");
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
