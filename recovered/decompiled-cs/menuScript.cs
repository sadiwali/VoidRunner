using System.Collections;
using System.IO;
using UnityEngine;
using UnityEngine.UI;

public class menuScript : MonoBehaviour
{
	public GameObject[] menus;

	public Text serverStatus;

	public Text ipSay;

	public InputField inpt;

	public InputField serverIP;

	public Button btnReady;

	public Button btnSearchServer;

	public Texture2D cursor;

	public string MasterServerProcessName;

	private string MasterServerDir = "masterserver.bat";

	private wNT nWT;

	private Vector3 refPos;

	public Image title;

	public float parallaxRange;

	public string[] badWords;

	private void Start()
	{
		refPos = new Vector3(title.GetComponent<RectTransform>().localPosition.x, title.GetComponent<RectTransform>().localPosition.y - 1000f, title.GetComponent<RectTransform>().localPosition.z);
		Cursor.visible = true;
		Cursor.SetCursor(cursor, new Vector2(0f, 0f), CursorMode.Auto);
		int @int = PlayerMemories.GetInt("timesPlayed");
		@int++;
		PlayerMemories.SetInt("timesPlayed", @int);
		achievements.EvalDedicated(PlayerMemories.GetInt("timesPlayed"));
		if (PlayerMemories.GetInt("SPlvlCounter") == 3)
		{
			achievements.EvalFinisher();
		}
		inpt.text = PlayerMemories.GetString("name");
	}

	private void Update()
	{
		title.GetComponent<RectTransform>().localPosition = Vector3.Lerp(title.GetComponent<RectTransform>().localPosition, new Vector3(0f - (refPos.x + Mathf.Clamp(Input.mousePosition.x - (float)(Screen.width / 2), 0f - parallaxRange, parallaxRange)), 0f - (refPos.y + Mathf.Clamp(Input.mousePosition.y - (float)(Screen.height / 2), 0f - parallaxRange, parallaxRange)), refPos.z), Time.deltaTime);
	}

	private void Awake()
	{
		nWT = GameObject.FindWithTag("netMan").GetComponent<wNT>();
	}

	public void Play()
	{
		if (string.IsNullOrEmpty(inpt.text))
		{
			inpt.text = "User" + Random.Range(0, 1000);
			return;
		}
		PlayerMemories.SetString("name", inpt.text);
		if ((bool)GameObject.FindWithTag("textSayer"))
		{
			GameObject.FindWithTag("textSayer").GetComponent<Text>().text += ">Name saved in playerInfo.txt. \r\n PlayerMemes used without error\r\n";
		}
		menus[0].SetActive(value: false);
		menus[1].SetActive(value: true);
	}

	public void btnAch()
	{
		menus[0].SetActive(value: false);
		menus[5].SetActive(value: true);
	}

	public void StartServer()
	{
		menus[0].SetActive(value: false);
		menus[3].SetActive(value: true);
		nWT.setMasterServerIP(Network.player.ipAddress);
		if (!File.Exists(MasterServerDir))
		{
			ipSay.text = "MasterServer directory could not be located. (" + MasterServerDir + ")";
			return;
		}
		ipSay.text = "MasterServer batch file found...";
		StartCoroutine("CheckMasterServerStart");
	}

	private IEnumerator CheckMasterServerStart()
	{
		yield return new WaitForSeconds(1f);
		while (true)
		{
			ipSay.text = "Checking for MasterServer...";
			yield return new WaitForSeconds(2f);
		}
	}

	public void Solo()
	{
		string empty = string.Empty;
		empty = PlayerMemories.GetInt("SPlvlCounter") switch
		{
			0 => "scene_lvl1", 
			1 => "scene_lvl2", 
			2 => "scene_lvl3", 
			_ => "scene_lvl1", 
		};
		nWT.StartCoroutine("adv_sceneLoader", empty);
	}

	public void MusicSlider()
	{
		GameObject.Find("Main Camera").GetComponent<AudioSource>().volume = GameObject.FindWithTag("MusicSlider").GetComponent<Slider>().value;
	}

	public void Comp()
	{
		menus[1].SetActive(value: false);
		menus[2].SetActive(value: true);
	}

	public void BackMM()
	{
		if (menus[3].activeSelf)
		{
		}
		for (int i = 0; i < menus.Length; i++)
		{
			menus[i].SetActive(value: false);
		}
		btnReady.interactable = false;
		menus[0].SetActive(value: true);
		nWT.DisconnectFromServer();
	}

	public void SearchServer()
	{
		nWT.StartCoroutine("RefreshHostList");
	}

	public void Ready()
	{
		nWT.callRPC_addReady();
		serverStatus.text += "\r\nYou are ready";
		achievements.EvalFriends();
		btnReady.interactable = false;
	}

	public void Credits()
	{
		menus[0].SetActive(value: false);
		menus[4].SetActive(value: true);
	}

	public void Checkname()
	{
		string text = inpt.text;
		for (int i = 0; i < badWords.Length; i++)
		{
			if (text.ToLower().Contains(badWords[i].ToLower()))
			{
				inpt.text = "BAD WORD";
			}
		}
	}

	public void Checkip()
	{
		string text = serverIP.text;
		string[] array = text.Split('.');
		if (array.Length != 4)
		{
			serverStatus.text = "Incorrect IP format. Should be: 000.000.000.000";
			btnSearchServer.interactable = false;
			return;
		}
		for (int i = 0; i < array.Length; i++)
		{
			if (!int.TryParse(array[i], out var _))
			{
				serverStatus.text = "Incorrect IP format. Only numeric values allowed";
				btnSearchServer.interactable = false;
				break;
			}
			nWT.setMasterServerIP(text);
			serverStatus.text = "Please search for a server";
			if (!Network.isClient)
			{
				btnSearchServer.interactable = true;
			}
		}
	}
}
