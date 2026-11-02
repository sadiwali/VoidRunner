using UnityEngine;

public class Turret : MonoBehaviour
{
	public int curHealth;

	public int maxHealth;

	public float distance;

	public float wakeRange;

	public float shootInterval;

	public float bulletSpeed = 100f;

	public float bulletTimer;

	public bool awake;

	public bool lookingRight;

	public GameObject bullet;

	public Transform target;

	public Animator anim;

	public Transform shootPointLeft;

	public Transform shootPointRight;

	private void Awake()
	{
		anim = base.gameObject.GetComponent<Animator>();
		target = GameObject.FindWithTag("plr").GetComponent<Transform>();
	}

	private void Start()
	{
		curHealth = maxHealth;
	}

	private void Update()
	{
		anim.SetBool("Awake", awake);
		anim.SetBool("LookingRight", lookingRight);
		RangeCheck();
		if (target.transform.position.x > base.transform.position.x)
		{
			lookingRight = true;
		}
		else
		{
			lookingRight = false;
		}
	}

	private void RangeCheck()
	{
		distance = Vector3.Distance(base.transform.position, target.transform.position);
		if (distance < wakeRange)
		{
			awake = true;
		}
		if (distance > wakeRange)
		{
			awake = false;
		}
	}

	public void Attack(bool attackingRight)
	{
		bulletTimer += Time.deltaTime;
		if (bulletTimer >= shootInterval)
		{
			Vector2 vector = target.transform.position - base.transform.position;
			vector.Normalize();
			if (!attackingRight)
			{
				GameObject gameObject = Object.Instantiate(bullet, shootPointLeft.transform.position, shootPointLeft.transform.rotation) as GameObject;
				gameObject.GetComponent<Rigidbody2D>().velocity = vector * bulletSpeed;
				bulletTimer = 0f;
			}
			if (attackingRight)
			{
				GameObject gameObject2 = Object.Instantiate(bullet, shootPointRight.transform.position, shootPointRight.transform.rotation) as GameObject;
				gameObject2.GetComponent<Rigidbody2D>().velocity = vector * bulletSpeed;
				bulletTimer = 0f;
			}
		}
	}
}
