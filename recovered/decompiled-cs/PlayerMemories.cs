using System.Collections.Generic;
using System.IO;

public static class PlayerMemories
{
	private static string fileName;

	private static List<string> wData;

	static PlayerMemories()
	{
		fileName = "binInternalInfo.txt";
		wData = new List<string>();
	}

	private static void Read()
	{
		wData.Clear();
		if (File.Exists(fileName))
		{
			string[] array = File.ReadAllLines(fileName);
			for (int i = 0; i < array.Length; i++)
			{
				wData.Add(array[i]);
			}
		}
		else
		{
			new StreamWriter(fileName).Close();
		}
	}

	public static string GetString(string what)
	{
		Read();
		int num = 0;
		string result = string.Empty;
		for (int i = 0; i < wData.Count; i++)
		{
			if (wData[i].Contains(what + " :"))
			{
				result = wData[i].Remove(0, what.Length + 2);
				break;
			}
			num++;
		}
		if (num == wData.Count)
		{
			return string.Empty;
		}
		return result;
	}

	public static void SetString(string name, string val)
	{
		Read();
		bool flag = false;
		for (int i = 0; i < wData.Count; i++)
		{
			if (wData[i].Contains(name + " :"))
			{
				wData[i] = name + " :" + val;
				Save();
				flag = true;
				break;
			}
		}
		if (!flag)
		{
			wData.Add(name + " :" + val);
			Save();
		}
	}

	public static int GetInt(string what)
	{
		Read();
		int num = 0;
		int result = 0;
		for (int i = 0; i < wData.Count; i++)
		{
			if (wData[i].Contains(what + " :"))
			{
				result = int.Parse(wData[i].Remove(0, what.Length + 2));
				break;
			}
			num++;
		}
		if (num == wData.Count)
		{
			return 0;
		}
		return result;
	}

	public static void SetInt(string name, int n)
	{
		Read();
		bool flag = false;
		for (int i = 0; i < wData.Count; i++)
		{
			if (wData[i].Contains(name + " :"))
			{
				wData[i] = name + " :" + n;
				Save();
				flag = true;
				break;
			}
		}
		if (!flag)
		{
			wData.Add(name + " :" + n);
			Save();
		}
	}

	public static List<string> GetList(string what)
	{
		Read();
		List<string> list = new List<string>();
		for (int i = 0; i < wData.Count; i++)
		{
			if (wData[i].Contains(what + " :"))
			{
				string text = wData[i].Remove(0, what.Length + 2);
				string[] array = text.Trim().Split(',');
				for (int j = 0; j < array.Length - 1; j++)
				{
					list.Add(array[j]);
				}
				break;
			}
		}
		return list;
	}

	public static void SetList(string name, List<string> lst)
	{
		Read();
		string text = string.Empty;
		for (int i = 0; i < lst.Count; i++)
		{
			text = text + lst[i] + ",";
		}
		bool flag = false;
		for (int j = 0; j < wData.Count; j++)
		{
			if (wData[j].Contains(name + " :"))
			{
				wData[j] = name + " :" + text;
				flag = true;
				Save();
				break;
			}
		}
		if (!flag)
		{
			wData.Add(name + " :" + text);
			Save();
		}
	}

	private static void Save()
	{
		string[] array = wData.ToArray();
		using StreamWriter streamWriter = new StreamWriter(fileName);
		for (int i = 0; i < wData.Count; i++)
		{
			streamWriter.WriteLine(wData[i]);
		}
	}
}
