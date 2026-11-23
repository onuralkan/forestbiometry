<section class="card guide-sec">
<?= $sec('troubleshooting', 'Troubleshooting') ?>
<h3>The page does not load, or loads only partly</h3>
<p>On some networks and browsers a page may not open at all, may look blank or unstyled (the style sheets missing), or a tool may not respond to its buttons. If the browser's developer console (F12 → Console) shows <code>net::ERR_QUIC_PROTOCOL_ERROR</code>, the problem is not in the site's code but in the <b>QUIC</b> (HTTP/3) connection the browser uses to talk to the server. QUIC runs over UDP; some company, school and hotel networks, firewalls or VPNs block or break this traffic. The browser usually falls back to the older connection (HTTP/2 over TCP) by itself, but not always.</p>
<p>Try these first: reload the page (Ctrl+F5 / Cmd+Shift+R), open it from another network (e.g. your phone's mobile data) or turn the VPN off. If the problem remains, turn QUIC off in the browser. The setting applies to every site; the browser still connects over secure HTTPS (HTTP/2), only setting up a connection may be a little slower on some sites. You can turn it back on the same way at any time.</p>
<h3>Chrome, Edge, Brave, Opera, Vivaldi (Chromium-based)</h3>
<ol>
<li>Type the address for your browser in the address bar and press Enter:
<ul>
<li>Chrome: <code>chrome://flags/#enable-quic</code></li>
<li>Edge: <code>edge://flags/#enable-quic</code></li>
<li>Brave: <code>brave://flags/#enable-quic</code></li>
<li>Opera: <code>opera://flags/#enable-quic</code></li>
<li>Vivaldi: <code>vivaldi://flags/#enable-quic</code></li>
</ul></li>
<li>Set the highlighted <b>Experimental QUIC protocol</b> row to <b>Disabled</b>.</li>
<li>Press the <b>Relaunch</b> button that appears at the bottom of the page. Open tabs are reopened.</li>
</ol>
<p>The same address (<code>chrome://flags/#enable-quic</code>) works in Chrome on Android. To turn it back on, set the row to <b>Default</b>. The "flags" page is for experimental settings; later browser versions may rename or remove this one.</p>
<h3>Firefox</h3>
<ol>
<li>Type <code>about:config</code> in the address bar and pass the warning with <b>Accept the Risk and Continue</b>.</li>
<li>Type <code>network.http.http3.enable</code> in the search box (in older versions it is called <code>network.http.http3.enabled</code>).</li>
<li>Set the value to <b>false</b> with the toggle button on the right of the row. No restart is needed; reload the open tab.</li>
</ol>
<p>To turn it back on, set the value to <b>true</b> again or press the reset button on the row.</p>
<h3>Safari and the browsers on iPhone/iPad</h3>
<p>Safari has no supported setting for turning QUIC off. On iPhone and iPad every browser (Chrome and Edge included) uses Safari's engine, so the setting is not there either. On these devices try another network, or turn the VPN or iCloud Private Relay off for a while; on a Mac you can use Chrome, Edge or Firefox set up as above.</p>
<h3>If the problem remains</h3>
<p>If none of this helps, report your browser's name and version, your operating system, the network you connect from and the error message in the console. Once loaded, the tools do their calculations in your browser; a connection problem does not affect the data you entered, and your session stays saved in this browser.</p>
</section>
