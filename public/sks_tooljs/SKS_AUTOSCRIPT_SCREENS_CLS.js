// @ts-nocheck
/* eslint-disable no-undef */
/// <reference path="@javaapi/global.d.ts" />

try { load('nashorn:mozilla_compat.js'); } catch (e) {}

// importPackage
try { importPackage(java.lang); } catch (e) {}
try { importPackage(java.sql); } catch (e) {}
try { importPackage(Packages.psdi.webclient.system.controller); } catch (e) {}
try { importPackage(Packages.psdi.webclient.system.session); } catch (e) {}
try { importPackage(Packages.psdi.webclient.system.runtime); } catch (e) {}

// Java.type
try { System = Java.type("java.lang.System"); } catch (e) {}
try { Level = Java.type("org.apache.log4j.Level"); } catch (e) {}
try { MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory"); } catch (e) {}
try { MXServer = Java.type("psdi.server.MXServer"); } catch (e) {}
try { MboConstants = Java.type("psdi.mbo.MboConstants"); } catch (e) {}
try { SqlFormat = Java.type("psdi.mbo.SqlFormat"); } catch (e) {}
try { MXException = Java.type("psdi.util.MXException"); } catch (e) {}
try { MXAccessException = Java.type("psdi.util.MXAccessException"); } catch (e) {}
try { MXApplicationException = Java.type("psdi.util.MXApplicationException"); } catch (e) {}
try { RuntimeException = Java.type("java.lang.RuntimeException"); } catch (e) {}
try { RESTRequest = Java.type("com.ibm.tivoli.oslc.RESTRequest"); } catch (e) {}
try { MXSession = Java.type("psdi.util.MXSession"); } catch (e) {}
try { URLDecoder = Java.type("java.net.URLDecoder"); } catch (e) {}
try { StandardCharsets = Java.type("java.nio.charset.StandardCharsets"); } catch (e) {}
try { StringReader = Java.type("java.io.StringReader"); } catch (e) {}
try { StringWriter = Java.type("java.io.StringWriter"); } catch (e) {}
try { PresentationLoader = Java.type("psdi.webclient.system.controller.PresentationLoader"); } catch (e) {}
try { PresentationParser = Java.type("psdi.webclient.system.controller.PresentationParser"); } catch (e) {}
try { WebClientSessionFactory = Java.type("psdi.webclient.system.session.WebClientSessionFactory"); } catch (e) {}
try { WebClientRuntime = Java.type("psdi.webclient.system.runtime.WebClientRuntime"); } catch (e) {}
try { IdProperty = Java.type("psdi.webclient.system.controller.IdProperty"); } catch (e) {}
try { LabelCacheMgr = Java.type("psdi.webclient.system.controller.LabelCacheMgr"); } catch (e) {}

// JDOM2 / JDOM fallback
try {
    Element = Java.type("org.jdom2.Element");
    SAXBuilder = Java.type("org.jdom2.input.SAXBuilder");
    Format = Java.type("org.jdom2.output.Format");
    XMLOutputter = Java.type("org.jdom2.output.XMLOutputter");
} catch (error) {
}