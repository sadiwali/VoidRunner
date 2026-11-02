using System.Collections;
using UnityEngine;

public class molerat : MonoBehaviour
{
	private Animator anim;

	private bool idle;

	public bool toleft;

	public bool toUp;

	private Transform target;

	private Rigidbody2D rb2d;

	public bool saveEdge;

	private bool canjump = true;

	public float speed;

	public float maxVerticalDistance;

	public float maxHorizontalDistance;

	public float runBackTime;

	private Vector2 mypos;

	public bool platUp;

	public bool platDown;

	public bool grounded;

	public GameObject[] child;

	private bool wasleft;

	private bool runningBack;

	private void Start()
	{
		rb2d = GetComponent<Rigidbody2D>();
		anim = GetComponent<Animator>();
		target = GameObject.FindWithTag("plr").GetComponent<Transform>();
	}

	private IEnumerator canitjump()
	{
		canjump = false;
		yield return new WaitForSeconds(2f);
		canjump = true;
	}

	private void runBack()
	{
		wasleft = toleft;
		if (wasleft)
		{
			base.transform.localScale = new Vector3(-5f, 5f, 5f);
			rb2d.AddForce(Vector2.right * speed * 2f);
		}
		else
		{
			base.transform.localScale = new Vector3(5f, 5f, 5f);
			rb2d.AddForce(Vector2.right * (0f - speed) * 2f);
		}
	}

	private IEnumerator countDownToStopSaveEdge()
	{
		rb2d.velocity = Vector2.zero;
		yield return new WaitForSeconds(runBackTime);
		saveEdge = false;
		disableChildren(truly: true);
		runningBack = false;
	}

	private void disableChildren(bool truly)
	{
		if (truly)
		{
			saveEdge = false;
			GameObject[] array = child;
			foreach (GameObject gameObject in array)
			{
				gameObject.SetActive(value: false);
			}
		}
		else
		{
			GameObject[] array2 = child;
			foreach (GameObject gameObject2 in array2)
			{
				gameObject2.SetActive(value: true);
			}
		}
	}

	private void FixedUpdate()
	{
		anim.SetBool("idle", idle);
		if (Vector2.Distance(mypos, target.position) > 500f)
		{
			Object.Destroy(base.gameObject);
		}
		if (saveEdge && !platUp && !platDown)
		{
			disableChildren(truly: true);
			runBack();
			if (!runningBack)
			{
				runningBack = true;
				StartCoroutine("countDownToStopSaveEdge");
			}
			return;
		}
		mypos = base.transform.position;
		if (mypos.x < target.position.x)
		{
			toleft = false;
		}
		else
		{
			toleft = true;
		}
		if (mypos.y < target.position.y)
		{
			toUp = true;
		}
		else
		{
			toUp = false;
		}
		if (Mathf.Abs(mypos.y - target.position.y) > maxVerticalDistance || Vector2.Distance(mypos, target.position) > maxHorizontalDistance)
		{
			idle = true;
		}
		else
		{
			idle = false;
		}
		if (!grounded)
		{
			disableChildren(truly: true);
		}
		else
		{
			disableChildren(truly: false);
		}
		if (platUp && toUp && Mathf.Abs(mypos.y - target.position.y) > 2f && canjump)
		{
			rb2d.velocity = Vector2.zero;
			if (toleft)
			{
				rb2d.AddForce(Vector2.right * -150f);
			}
			else
			{
				rb2d.AddForce(Vector2.right * 150f);
			}
			rb2d.AddForce(Vector2.up * 120f * Mathf.Clamp(Mathf.Abs(mypos.y - target.position.y), 4f, 8f));
			StartCoroutine("canitjump");
		}
		if (!platDown || !toUp)
		{
		}
		if (toleft)
		{
			if (!saveEdge)
			{
				if (!idle)
				{
					rb2d.AddForce(Vector2.right * (0f - speed));
				}
				base.transform.localScale = new Vector3(5f, 5f, 5f);
			}
		}
		else if (!saveEdge)
		{
			if (!idle)
			{
				rb2d.AddForce(Vector2.right * speed);
			}
			base.transform.localScale = new Vector3(-5f, 5f, 5f);
		}
	}

	private void OnTriggerEnter2D(Collider2D col)
	{
		if (col.CompareTag("ground"))
		{
			grounded = true;
		}
	}

	private void OnTriggerExit2D(Collider2D col)
	{
		if (col.CompareTag("ground"))
		{
			grounded = false;
		}
	}
}
