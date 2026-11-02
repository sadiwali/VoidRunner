using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class wNT : MonoBehaviour
{
	private NetworkView ntv;

	private string registeredGameName = "dfadf3adfadff%&33333";

	private float refreshRequestLength = 2f;

	private HostData[] hostData;

	public int connectionTimeout;

	private int timeInSeconds;

	public static int internalplrC;

	private int _endC;

	private int _readyC;

	private int _joinedGood;

	private bool locked;

	private int myScore;

	private string toSend = string.Empty;

	private int SPlvlCounter;

	public bool finished;

	private Text textSayer;

	private Text GameOverSayer;

	private string ipp = string.Empty;

	private List<string> playerNames = new List<string>();

	private List<string> playerIPs = new List<string>();

	private List<string> playerAchievements = new List<string>();

	private List<int> scores = new List<int>();

	private string[] maps = new string[4] { "intro", "dark", "cold", "death" };

	public int levelToLoad;

	public int maxRoundTime;

	private menuScript MenuScript;

	private Player plr;

	private Sayer sayer;

	private NetworkPlayerPositionTransfer nppt;

	private void Awake()
	{
		Object.DontDestroyOnLoad(base.transform.gameObject);
		ntv = base.gameObject.GetComponent<NetworkView>();
		if ((bool)GameObject.FindWithTag("nppt"))
		{
			nppt = GameObject.FindWithTag("nppt").GetComponent<NetworkPlayerPositionTransfer>();
		}
	}

	private void Start()
	{
		STRT();
	}

	public void STRT()
	{
		finished = false;
		if ((bool)GameObject.FindWithTag("Sayer"))
		{
			sayer = GameObject.FindWithTag("Sayer").GetComponent<Sayer>();
		}
		if ((bool)GameObject.FindWithTag("MainCamera"))
		{
			MenuScript = GameObject.FindWithTag("MainCamera").GetComponent<menuScript>();
		}
		MasterServer.port = 23466;
		if ((bool)GameObject.FindWithTag("plr"))
		{
			plr = GameObject.FindWithTag("plr").GetComponent<Player>();
		}
		if ((bool)GameObject.FindWithTag("GameOverSayer"))
		{
			GameOverSayer = GameObject.FindWithTag("GameOverSayer").GetComponent<Text>();
		}
		MonoBehaviour.print(Network.connections.Length);
	}

	public void setMasterServerIP(string ip)
	{
		ipp = ip;
		MasterServer.ipAddress = ip;
	}

	private void Update()
	{
		if (Network.isServer && timeInSeconds == maxRoundTime && _endC != Network.connections.Length)
		{
			callRPC_Say("The game devs are not plased at your performance :(", 6);
			ntv.RPC("endgamePremature", RPCMode.Others);
		}
	}

	private void OnServerInitialized()
	{
		writeOut("low-level Network has been initialzed");
		GameObject.Find("ipSay").GetComponent<Text>().text = "low-level network has been initialized. Please wait for masterserver confirmation and IP...";
	}

	private void OnMasterServerEvent(MasterServerEvent msEvent)
	{
		if (msEvent == MasterServerEvent.RegistrationSucceeded)
		{
			writeOut("MasterServer registration succeeded!");
			GameObject.Find("ipSay").GetComponent<Text>().text = "Open another instance to Play. Your server is live on: " + Network.player.ipAddress;
			StartCoroutine("CheckProcessClose");
		}
	}

	private void OnPlayerConnected(NetworkPlayer player)
	{
		playerIPs.Add(player.ipAddress);
		if (locked)
		{
			Network.CloseConnection(player, sendDisconnectionNotification: true);
		}
		ntv.RPC("addUp", RPCMode.OthersBuffered, Network.connections.Length, _readyC);
	}

	private IEnumerator CheckProcessClose()
	{
		while (true)
		{
			yield return new WaitForSeconds(5f);
		}
	}

	private void OnPlayerDisconnected(NetworkPlayer player)
	{
		callRPC_Say("Someone has been disconnected! Server will close now!", 3);
		StartCoroutine("closeServerBCDC");
	}

	private IEnumerator closeServerBCDC()
	{
		yield return new WaitForSeconds(3f);
		ntv.RPC("DisconnectFromServer", RPCMode.OthersBuffered);
	}

	public void StartServer()
	{
		Network.InitializeServer(32, 25002, useNat: false);
		MasterServer.RegisterHost(registeredGameName, "VoidRunner", "VoidRunner server Main");
	}

	public IEnumerator RefreshHostList()
	{
		sayer.Say("Refreshing...", 5);
		MasterServer.RequestHostList(registeredGameName);
		float timeEnded = Time.time + refreshRequestLength;
		while (Time.time < timeEnded)
		{
			hostData = MasterServer.PollHostList();
			yield return new WaitForEndOfFrame();
		}
		if (hostData == null || hostData.Length == 0)
		{
			sayer.Say("Cant find any servers :/", 2);
			MenuScript.serverStatus.text = "No servers found";
		}
		else
		{
			Network.Connect(hostData[0]);
			MenuScript.btnSearchServer.interactable = false;
			StartCoroutine("CheckIfConnected");
		}
	}

	private IEnumerator OnServerDisconnectedInternal()
	{
		do
		{
			yield return new WaitForSeconds(5f);
		}
		while (Network.isClient);
		sayer.Say("Uh Oh! The server has closed! Returning to main menu...", 2);
		yield return new WaitForSeconds(3f);
		DisconnectFromServer();
	}

	[RPC]
	public void DisconnectFromServer()
	{
		if (Network.isClient)
		{
			Network.Disconnect();
		}
		if (Application.loadedLevelName == "scene_mainMenu")
		{
			MenuScript.serverStatus.text = "Disconnected";
		}
		else
		{
			StartCoroutine("loadgameGame", 0);
		}
	}

	private IEnumerator CheckIfConnected()
	{
		yield return new WaitForSeconds(connectionTimeout);
		if (Network.isClient)
		{
			sayer.Say("Aw yeah!", 2);
			MenuScript.btnReady.interactable = true;
			MenuScript.btnSearchServer.interactable = false;
			StartCoroutine("OnServerDisconnectedInternal");
		}
		else
		{
			sayer.Say("Darn it...", 2);
			MenuScript.serverStatus.text = "Failed to Connect";
			MenuScript.btnSearchServer.interactable = true;
			DisconnectFromServer();
		}
	}

	public void FormulateScore(string myName, int a, int b, int c, int d, int e)
	{
		StopCoroutine("gameTimer");
		string text = a + "," + b + "," + c + "," + d + "," + e;
		if (a == 0 && b == 0 && c == 0 && d == 0 && e == 0)
		{
			myScore = 0;
		}
		else
		{
			myScore = 1000 - (b * 2 + e * 5 + timeInSeconds);
		}
		ntv.RPC("endGame", RPCMode.Server, myName, myScore, text);
	}

	private IEnumerator gameTimer()
	{
		while (true)
		{
			yield return new WaitForSeconds(1f);
			timeInSeconds++;
		}
	}

	public void callRPC_loadedMap()
	{
		writeOut("map loaded");
		ntv.RPC("loadedMap", RPCMode.Server);
	}

	public void callRPC_addReady()
	{
		ntv.RPC("addReady", RPCMode.Server);
	}

	public void callRPC_Say(string s, int t)
	{
		ntv.RPC("Say", RPCMode.OthersBuffered, s, t);
		writeOut(s);
	}

	public void callRPC_TransferPositionValues(Vector3 t, string whoIP)
	{
		if (Network.isClient)
		{
			ntv.RPC("TransferPositionValues", RPCMode.Others, t, whoIP);
		}
	}

	[RPC]
	private void endGame(string gotName, int gotScore, string gotAchievements)
	{
		if (gotName == "-1" && gotScore == -1 && gotAchievements == "-1")
		{
			return;
		}
		_endC++;
		playerNames.Add(gotName);
		scores.Add(gotScore);
		playerAchievements.Add(gotAchievements);
		callRPC_Say($"{gotName} finished the game with score: {gotScore}", 5);
		if (_endC != Network.connections.Length)
		{
			return;
		}
		MonoBehaviour.print("begins sorting");
		List<int> list = scores;
		List<string> list2 = new List<string>();
		List<string> list3 = new List<string>();
		list.Sort();
		list.Reverse();
		for (int i = 0; i < scores.Count; i++)
		{
			list2.Insert(list.IndexOf(scores[i]), playerNames[i]);
			list3.Insert(list.IndexOf(scores[i]), playerAchievements[i]);
		}
		playerNames = list2;
		playerAchievements = list3;
		scores = list;
		string text = string.Empty;
		string text2 = string.Empty;
		string text3 = string.Empty;
		string text4 = string.Empty;
		string text5 = string.Empty;
		int num = 0;
		int num2 = 0;
		int num3 = 0;
		int num4 = 0;
		int num5 = 0;
		for (int j = 0; j < playerAchievements.Count; j++)
		{
			string[] array = playerAchievements[j].Split(',');
			if (int.Parse(array[0]) > num)
			{
				num = int.Parse(array[0]);
				text = playerNames[j];
			}
			if (int.Parse(array[1]) > num2)
			{
				num2 = int.Parse(array[1]);
				text2 = playerNames[j];
			}
			if (int.Parse(array[2]) > num3)
			{
				num3 = int.Parse(array[2]);
				text3 = playerNames[j];
			}
			if (int.Parse(array[3]) > num4)
			{
				num4 = int.Parse(array[3]);
				text4 = playerNames[j];
			}
			if (int.Parse(array[4]) > num5)
			{
				num5 = int.Parse(array[4]);
				text5 = playerNames[j];
			}
		}
		if (string.IsNullOrEmpty(text))
		{
			text = "Nobody";
		}
		if (string.IsNullOrEmpty(text2))
		{
			text2 = "Nobody";
		}
		if (string.IsNullOrEmpty(text3))
		{
			text3 = "Nobody";
		}
		if (string.IsNullOrEmpty(text4))
		{
			text4 = "Nobody";
		}
		if (string.IsNullOrEmpty(text5))
		{
			text5 = "Nobody";
		}
		toSend = string.Empty + playerNames[0] + "," + scores[0] + "," + playerNames[1] + "," + scores[1] + "," + playerNames[2] + "," + scores[2] + "," + text + "," + text2 + "," + text3 + "," + text4 + "," + text5;
		_endC = 0;
		ntv.RPC("DisplayEndGame", RPCMode.OthersBuffered, toSend);
		StartCoroutine("nextGame");
	}

	[RPC]
	private void endGamePremature()
	{
		if (!finished)
		{
			plr.SaveScores(t: false);
		}
	}

	[RPC]
	private void addReady()
	{
		_readyC++;
		ntv.RPC("addUp", RPCMode.OthersBuffered, Network.connections.Length, _readyC);
		if (_readyC == Network.connections.Length)
		{
			if (Network.connections.Length >= 3)
			{
				ntv.RPC("loadGame", RPCMode.OthersBuffered, levelToLoad);
			}
			else
			{
				callRPC_Say("Minimum of 3 players must be connected to the server to start", 5);
			}
		}
	}

	[RPC]
	private void loadedMap()
	{
		_joinedGood++;
		if (_joinedGood == Network.connections.Length)
		{
			string text = string.Empty;
			for (int i = 0; i < playerNames.Count; i++)
			{
				text = text + playerNames[i] + ",";
			}
			ntv.RPC("startGame", RPCMode.OthersBuffered, text, Network.connections.Length);
		}
	}

	[RPC]
	private void addUp(int plrC, int readyC)
	{
		internalplrC = plrC;
		writeOut($"{readyC} out of {plrC} players are ready.");
		if ((bool)GameObject.FindWithTag("serverStatus"))
		{
			MenuScript.serverStatus.text = $"{readyC} out of {plrC} players are ready.";
		}
	}

	[RPC]
	private void loadGame(int level)
	{
		locked = true;
		sayer.Say($"Game starting in 5 seconds... Map is determined to be {maps[level]}", 4);
		if ((bool)GameObject.FindWithTag("serverStatus"))
		{
			MenuScript.serverStatus.text = "Game is starting in 5 seconds... Map is determined to be " + maps[level];
		}
		StartCoroutine("loadgameGame", level);
	}

	public IEnumerator loadgameGame(int lvl)
	{
		writeOut("Loading next level " + lvl);
		yield return new WaitForSeconds(3f);
		Application.LoadLevel("scene_loading");
		yield return new WaitForSeconds(5f);
		Application.LoadLevel(lvl);
	}

	public IEnumerator loadGameSP()
	{
		MonoBehaviour.print("a");
		string currLevel = Application.loadedLevelName;
		MonoBehaviour.print("a");
		Application.LoadLevel("scene_loading");
		MonoBehaviour.print("a");
		yield return new WaitForSeconds(5f);
		MonoBehaviour.print("a");
		switch (currLevel)
		{
		case "scene_lvl1":
			SPlvlCounter = 1;
			PlayerMemories.SetInt("SPlvlCounter", SPlvlCounter);
			Application.LoadLevel("scene_lvl2");
			break;
		case "scene_lvl2":
			SPlvlCounter = 2;
			PlayerMemories.SetInt("SPlvlCounter", SPlvlCounter);
			Application.LoadLevel("scene_lvl3");
			break;
		case "scene_lvl3":
			SPlvlCounter = 3;
			PlayerMemories.SetInt("SPlvlCounter", SPlvlCounter);
			Application.LoadLevel("scene_mainMenu");
			break;
		}
	}

	public IEnumerator adv_sceneLoader(string level)
	{
		Application.LoadLevel("scene_loading");
		yield return new WaitForSeconds(2f);
		Application.LoadLevel(level);
	}

	[RPC]
	private void startGame(string import, int nim)
	{
		MonoBehaviour.print("Number of players on server side is " + nim);
		string[] array = import.Split(',');
		for (int i = 0; i < array.Length; i++)
		{
			playerNames.Add(array[i]);
		}
		StartCoroutine("CountDown");
	}

	private IEnumerator CountDown()
	{
		int i = 5;
		do
		{
			sayer.Say(string.Empty + i, 1);
			yield return new WaitForSeconds(1f);
			i--;
		}
		while (i > 0);
		plr.EndFreezeTime();
		StartCoroutine("gameTimer");
	}

	[RPC]
	private void Say(string s, int t)
	{
		writeOut(s + "\r\n");
		sayer.Say(s, t);
	}

	[RPC]
	public void DisplayEndGame(string import)
	{
		finished = false;
		string[] array = import.Split(',');
		writeOut(array[0] + " won the game with score: " + array[1]);
		writeOut(array[2] + " is second place with score: " + array[3]);
		writeOut(array[4] + " is third place with score: " + array[5]);
		writeOut(array[6] + " walljumped the most");
		writeOut(array[7] + " took the most damage");
		writeOut(array[8] + " used the most healthpacks");
		writeOut(array[9] + " jumped the most");
		writeOut(array[10] + " died the most number of times");
		achievements.EvalChamp(array[0]);
		GameOverSayer.text = $"{array[0]} won the game with score: {array[1]}!!!\r\n\r\n{array[2]} is second place with score: {array[3]},\r\n {array[4]} is third place with score: {array[5]}\r\n{array[6]} walljumped the most,\r\n{array[7]} took the most damage,\r\n{array[8]} used the most healthpacks,\r\n{array[9]} jumped the most ,\r\n{array[10]} died the most.\r\n\r\nGAME OVER >:D";
		writeOut("game over");
	}

	[RPC]
	private void TransferPositionValues(Vector3 t, string whoIP)
	{
		int num = playerIPs.IndexOf(whoIP);
		if (num >= 0)
		{
			ntv.RPC("DisplayTransferPositionValues", RPCMode.OthersBuffered, t, num, whoIP);
		}
	}

	[RPC]
	private void DisplayTransferPositionValues(Vector3 t, int ind, string realIP)
	{
		if (Network.player.ipAddress != realIP)
		{
			nppt.UpdatePos(t, ind);
		}
		writeOut(ind + "," + realIP);
	}

	private IEnumerator nextGame()
	{
		writeOut("server side starting next level...");
		callRPC_Say($"Please wait 10 seconds for next level: {maps[levelToLoad + 1]} to load...", 8);
		yield return new WaitForSeconds(5f);
		_joinedGood = 0;
		scores.Clear();
		playerNames.Clear();
		playerAchievements.Clear();
		if (levelToLoad == 3)
		{
			callRPC_Say("Game is now over. Returning players to Main Menu", 4);
			Application.LoadLevel("scene_mainMenu");
		}
		ntv.RPC("loadGame", RPCMode.OthersBuffered, ++levelToLoad);
	}

	private void writeOut(string s)
	{
		Debug.Log(s);
		if ((bool)GameObject.FindWithTag("textSayer"))
		{
			textSayer = GameObject.FindWithTag("textSayer").GetComponent<Text>();
			Text text = textSayer;
			text.text = text.text + s + "\r\n";
		}
	}
}
