using System.Collections;
using UnityEngine;
using UnityEngine.UI;

public class Player : MonoBehaviour
{
	public float maxSpeed = 3f;

	public float speed = 50f;

	public float jumpPower = 250f;

	public float maxVerticalSpeed = 4f;

	private int timesWallJumped;

	public float maxWallJumpPower;

	public float minWallJumpPower;

	public float drillSpeed;

	private bool wallJumpPress;

	public float wallJumpDecreaseMultiplier;

	public int curHealth;

	public int maxHealth = 5;

	public bool grounded;

	public bool falling;

	public bool drilling;

	public bool canDoubleJump;

	public bool wallSliding;

	public bool facingRight = true;

	public bool muted;

	private bool selectLeft = true;

	public int timeInSeconds;

	public int internalDeltaTime = 1;

	public Vector3 startPos;

	private Image white;

	private Image red;

	private Text gameOverSayer;

	private Sayer sayer;

	public GameObject PauseMenu;

	private wNT nWT;

	private Rigidbody2D rb2d;

	private Animator anim;

	private float lastVol;

	public int a_TimesWallJumped;

	public int a_TimesHit;

	public int a_HealthPacksUsed;

	public int a_TimesJumped;

	public int a_TimesDied;

	private bool scrolling;

	private float checker;

	private void Start()
	{
		if ((bool)GameObject.Find("GameOverSayer"))
		{
			gameOverSayer = GameObject.Find("GameOverSayer").GetComponent<Text>();
		}
		rb2d = base.gameObject.GetComponent<Rigidbody2D>();
		anim = base.gameObject.GetComponent<Animator>();
		if ((bool)GameObject.FindWithTag("netMan"))
		{
			nWT = GameObject.FindWithTag("netMan").GetComponent<wNT>();
		}
		curHealth = maxHealth;
		StartCoroutine("ScrollCheck");
		red = GameObject.FindWithTag("red").GetComponent<Image>();
		white = GameObject.FindWithTag("white").GetComponent<Image>();
		sayer = GameObject.FindWithTag("Sayer").GetComponent<Sayer>();
		sayer.Say("Please wait for all players to join.", 2);
		startPos = base.transform.position;
		MonoBehaviour.print(startPos);
		internalDeltaTime = 0;
		StartCoroutine("gameTimer");
		GameObject.Find("canv_HUD").GetComponentInChildren<HUD>().player = this;
	}

	private IEnumerator ScrollCheck()
	{
		while (true)
		{
			float check = checker;
			yield return new WaitForSeconds(0.5f);
			if (check == checker)
			{
				scrolling = false;
				checker = 0f;
			}
		}
	}

	private void Update()
	{
		if (Input.GetKeyDown(KeyCode.M))
		{
			if (muted)
			{
				muted = false;
			}
			else
			{
				muted = true;
			}
		}
		if (Input.GetKeyDown(KeyCode.Escape))
		{
			if (internalDeltaTime == 0)
			{
				internalDeltaTime = 1;
				Time.timeScale = 1f;
				PauseMenu.SetActive(value: false);
			}
			else if (internalDeltaTime == 1)
			{
				internalDeltaTime = 0;
				Time.timeScale = 0f;
				PauseMenu.SetActive(value: true);
			}
		}
		if (Time.deltaTime == 0f)
		{
			if (Input.GetKeyDown(KeyCode.A) || Input.GetKeyDown(KeyCode.LeftArrow))
			{
				PauseMenu.GetComponentInChildren<Text>().text = " (back)\t\t\t\tresume";
				selectLeft = true;
			}
			else if (Input.GetKeyDown(KeyCode.D) || Input.GetKeyDown(KeyCode.RightArrow))
			{
				PauseMenu.GetComponentInChildren<Text>().text = " back\t\t\t\t(resume) ";
				selectLeft = false;
			}
			if (Input.GetKeyDown(KeyCode.Return))
			{
				if (selectLeft)
				{
					Time.timeScale = 1f;
					nWT.StartCoroutine("adv_sceneLoader", "scene_mainMenu");
				}
				else
				{
					internalDeltaTime = 1;
					Time.timeScale = 1f;
					PauseMenu.SetActive(value: false);
				}
			}
		}
		if (muted && GameObject.FindWithTag("MainCamera").GetComponent<AudioSource>().volume != 0f)
		{
			float volume = Mathf.Lerp(GameObject.FindWithTag("MainCamera").GetComponent<AudioSource>().volume, 0f, Time.deltaTime * 5f);
			GameObject.FindWithTag("MainCamera").GetComponent<AudioSource>().volume = volume;
		}
		else
		{
			GameObject.FindWithTag("MainCamera").GetComponent<AudioSource>().volume = 0.15f;
		}
		if (Input.GetAxis("Mouse ScrollWheel") < 0f)
		{
			scrolling = true;
			checker += Input.GetAxis("Mouse ScrollWheel") * 5f;
			if (checker < -30f)
			{
				scrolling = false;
				checker = 0f;
			}
		}
		else if (Input.GetAxis("Mouse ScrollWheel") > 0f)
		{
			scrolling = false;
			checker = 0f;
		}
		if (scrolling)
		{
			GameObject.FindWithTag("MainCamera").GetComponent<CameraFollow>().cameraNorm = GameObject.FindWithTag("MainCamera").GetComponent<CameraFollow>().internalCameraNorm + checker;
		}
		else
		{
			GameObject.FindWithTag("MainCamera").GetComponent<CameraFollow>().cameraNorm = GameObject.FindWithTag("MainCamera").GetComponent<CameraFollow>().internalCameraNorm;
		}
		red.color = Color.Lerp(red.color, Color.clear, Time.deltaTime * 3f);
		anim.SetBool("Grounded", grounded);
		anim.SetFloat("Speed", Mathf.Abs(rb2d.velocity.x));
		anim.SetBool("falling", falling);
		anim.SetBool("WallSliding", wallSliding);
		anim.SetBool("drilling", drilling);
		if (rb2d.velocity.y < 0f)
		{
			falling = true;
		}
		else if (rb2d.velocity.y >= 0f)
		{
			falling = false;
		}
		if (wallSliding)
		{
			return;
		}
		if (Input.GetAxisRaw("Horizontal") < 0f && Time.deltaTime != 0f && internalDeltaTime != 0)
		{
			base.transform.localScale = new Vector3(-1f, 1f, 1f);
			facingRight = false;
		}
		if (Input.GetAxisRaw("Horizontal") > 0f && Time.deltaTime != 0f && internalDeltaTime != 0)
		{
			base.transform.localScale = new Vector3(1f, 1f, 1f);
			facingRight = true;
		}
		if (!grounded && Input.GetAxisRaw("Vertical") == -1f)
		{
			drilling = true;
			rb2d.AddForce(Vector2.up * (0f - drillSpeed));
		}
		else
		{
			drilling = false;
		}
		if (Input.GetButtonDown("Jump"))
		{
			if (grounded)
			{
				a_TimesJumped++;
				writeOut("TJ " + a_TimesJumped);
				achievements.EvalStronglegs(a_TimesJumped);
				rb2d.AddForce(Vector2.up * jumpPower * internalDeltaTime);
				canDoubleJump = true;
			}
			else if (canDoubleJump)
			{
				canDoubleJump = false;
				rb2d.velocity = new Vector2(rb2d.velocity.x, 0f);
				rb2d.AddForce(Vector2.up * jumpPower * internalDeltaTime);
			}
		}
	}

	public void IncrementTimesWallJumped()
	{
		if (wallJumpPress)
		{
			timesWallJumped++;
			a_TimesWallJumped++;
			writeOut("WJ " + a_TimesWallJumped);
			wallJumpPress = false;
		}
	}

	private void FixedUpdate()
	{
		if (wallSliding && Input.GetKey(KeyCode.LeftControl))
		{
			rb2d.velocity = new Vector2(rb2d.velocity.x, rb2d.velocity.y * 0.5f * (float)internalDeltaTime);
		}
		Vector3 vector = rb2d.velocity;
		vector.y = rb2d.velocity.y;
		vector.z = 0f;
		vector.x *= 0.75f;
		float axisRaw = Input.GetAxisRaw("Horizontal");
		if (wallSliding)
		{
			if (Input.GetAxisRaw("Horizontal") > 0f && !facingRight)
			{
				wallJumpPress = true;
				rb2d.AddForce(Vector2.up * Mathf.Clamp(maxWallJumpPower - (float)timesWallJumped * wallJumpDecreaseMultiplier * (float)internalDeltaTime, minWallJumpPower, maxWallJumpPower));
			}
			else if (Input.GetAxisRaw("Horizontal") < 0f && facingRight)
			{
				wallJumpPress = true;
				rb2d.AddForce(Vector2.up * Mathf.Clamp(maxWallJumpPower - (float)timesWallJumped * wallJumpDecreaseMultiplier * (float)internalDeltaTime, minWallJumpPower, maxWallJumpPower));
			}
			if (rb2d.velocity.y > maxVerticalSpeed)
			{
				rb2d.velocity = new Vector2(rb2d.velocity.x, maxVerticalSpeed);
			}
		}
		rb2d.AddForce(Vector2.right * speed * axisRaw * internalDeltaTime);
		if (grounded)
		{
			timesWallJumped = 0;
			rb2d.velocity = vector;
		}
		if (rb2d.velocity.x > maxSpeed)
		{
			rb2d.velocity = new Vector2(maxSpeed, rb2d.velocity.y);
		}
		if (rb2d.velocity.x < 0f - maxSpeed)
		{
			rb2d.velocity = new Vector2(0f - maxSpeed, rb2d.velocity.y);
		}
	}

	public void Die()
	{
		a_TimesDied++;
		writeOut("TD " + a_TimesDied);
		curHealth = 5;
		rb2d.velocity = new Vector2(0f, 0f);
		base.transform.position = startPos;
		StartCoroutine(Flash(Color.blue, 2));
	}

	public void SaveScores(bool t)
	{
		StopCoroutine("gameTimer");
		Color color = Color.white;
		color.a = 0.5f;
		white.color = color;
		internalDeltaTime = 0;
		string empty = string.Empty;
		empty = PlayerMemories.GetString("name");
		if (t)
		{
			gameOverSayer.text = $"{empty}\r\nYou finished in {timeInSeconds} seconds,\r\nwalljumped {a_TimesWallJumped} times,\r\ngot hit {a_TimesHit} times,\r\npicked up {a_HealthPacksUsed} healthpacks,\r\njumped {a_TimesJumped} times,\r\ndied {a_TimesDied} times.\r\n\r\nPlease wait until everyone finishes the game...";
			achievements.EvalQuick(timeInSeconds);
			if (Network.isClient)
			{
				nWT.FormulateScore(empty, a_TimesWallJumped, a_TimesHit, a_HealthPacksUsed, a_TimesJumped, a_TimesDied);
			}
		}
		else
		{
			gameOverSayer.text = $"{empty}\r\nYou did not finish the map! ({timeInSeconds} seconds),\r\nwalljumped {a_TimesWallJumped} times,\r\ngot hit {a_TimesHit} times,\r\npicked up {a_HealthPacksUsed} healthpacks,\r\njumped {a_TimesJumped} times,\r\ndied {a_TimesDied} times.\r\n\r\nPlease wait until everyone finishes the game...";
			if (Network.isClient)
			{
				nWT.FormulateScore(empty, 0, 0, 0, 0, 0);
			}
		}
		timeInSeconds = 0;
	}

	public void EndFreezeTime()
	{
		white.color = Color.clear;
		writeOut("ends freeze time");
		internalDeltaTime = 1;
		StartCoroutine("gameTimer");
	}

	private IEnumerator gameTimer()
	{
		while (true)
		{
			yield return new WaitForSeconds(1f);
			timeInSeconds++;
		}
	}

	public void Damage(int dmg)
	{
		red.color = new Color(Color.red.r, Color.red.g, Color.red.b, Color.red.a / 2f);
		MonoBehaviour.print("cahnge color red");
		a_TimesHit++;
		writeOut("DT " + a_TimesHit);
		achievements.EvalBandageman(a_TimesHit);
		curHealth -= dmg;
		StartCoroutine(Flash(Color.red, 3));
		if (curHealth <= 0)
		{
			Die();
		}
	}

	private IEnumerator Flash(Color col, int times)
	{
		for (int i = 1; i <= times; i++)
		{
			base.transform.GetComponent<SpriteRenderer>().color = col;
			yield return new WaitForSeconds(0.2f);
			base.transform.GetComponent<SpriteRenderer>().color = Color.white;
			yield return new WaitForSeconds(0.2f);
		}
	}

	public void Health()
	{
		a_HealthPacksUsed++;
		writeOut("HP " + a_HealthPacksUsed);
		curHealth++;
		if (curHealth > maxHealth)
		{
			curHealth = maxHealth;
		}
	}

	private void writeOut(string s)
	{
		Debug.Log(s);
	}
}
